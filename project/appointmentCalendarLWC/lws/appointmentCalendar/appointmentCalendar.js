import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getAppointments from '@salesforce/apex/AppointmentCalendarController.getAppointments';

const DAY_MS = 24 * 60 * 60 * 1000;

export default class AppointmentCalendar extends NavigationMixin(LightningElement) {
    // Automatically populated when placed on a Record Page (expects a Contact
    // record, since Appointment__c.Customer_Contact__c is a Lookup(Contact)).
    @api recordId;
    @api objectApiName;

    // Exposed in the Lightning App Builder property panel (see js-meta.xml).
    @api numberOfDays = 7;
    @api cardTitle = 'Appointment Calendar';

    // App Pages have no record context, so recordId is always null there.
    // This lets you paste a Contact Id directly in the App Builder property
    // panel to test the component outside of a Record Page.
    @api testContactId;

    weekStart = this.getMonday(new Date());
    appointments = [];
    wiredResult;
    isLoading = true;
    error;

    selectedAppointment;
    showModal = false;

    // Falls back to testContactId when there's no record context (App Page).
    get effectiveRecordId() {
        return this.recordId || this.testContactId;
    }

    @wire(getAppointments, {
        recordId: '$effectiveRecordId',
        startDate: '$startDateStr',
        endDate: '$endDateStr'
    })
    wiredAppointments(result) {
        this.wiredResult = result;
        this.isLoading = false;
        if (result.data) {
            this.appointments = result.data;
            this.error = undefined;
        } else if (result.error) {
            this.appointments = [];
            this.error = this.reduceError(result.error);
        }
    }

    // ---------- Derived getters ----------

    get startDateStr() {
        return this.formatDate(this.weekStart);
    }

    get endDateStr() {
        const end = new Date(this.weekStart.getTime() + (this.numberOfDays - 1) * DAY_MS);
        return this.formatDate(end);
    }

    get weekRangeLabel() {
        const start = this.weekStart;
        const end = new Date(this.weekStart.getTime() + (this.numberOfDays - 1) * DAY_MS);
        const opts = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
    }

    get hasNoAppointments() {
        return !this.isLoading && this.appointments.length === 0;
    }

    get days() {
        const dayList = [];
        for (let i = 0; i < this.numberOfDays; i++) {
            const d = new Date(this.weekStart.getTime() + i * DAY_MS);
            const dateStr = this.formatDate(d);

            // Appointment_Date__c (Apex Date) serializes as "yyyy-MM-dd", so it
            // compares directly against our own formatted date string.
            const dayAppointments = this.appointments
                .filter((a) => a.Appointment_Date__c === dateStr)
                .map((a) => ({
                    ...a,
                    displayName: a.Name,
                    timeLabel: `${this.formatTime(a.Start_Time__c)} – ${this.formatTime(a.End_Time__c)}`,
                    statusClass: 'slot ' + this.statusClass(a.Status__c),
                    serviceTypeName: a.Service_Type__r ? a.Service_Type__r.Name : '',
                    serviceResourceName: a.Service_Resource__r ? a.Service_Resource__r.Name : ''
                }));

            dayList.push({
                key: dateStr,
                dateLabel: d.toLocaleDateString(undefined, { weekday: 'short' }),
                dateNum: d.getDate(),
                isToday: this.isSameDay(d, new Date()),
                appointments: dayAppointments,
                hasAppointments: dayAppointments.length > 0
            });
        }
        return dayList;
    }

    // ---------- Event handlers ----------

    handlePrevWeek() {
        this.weekStart = new Date(this.weekStart.getTime() - this.numberOfDays * DAY_MS);
    }

    handleNextWeek() {
        this.weekStart = new Date(this.weekStart.getTime() + this.numberOfDays * DAY_MS);
    }

    handleToday() {
        this.weekStart = this.getMonday(new Date());
    }

    handleRefresh() {
        this.isLoading = true;
        refreshApex(this.wiredResult).finally(() => {
            this.isLoading = false;
        });
    }

    handleAppointmentClick(event) {
        const id = event.currentTarget.dataset.id;
        const found = this.appointments.find((a) => a.Id === id);
        if (found) {
            this.selectedAppointment = {
                ...found,
                timeLabel: `${this.formatTime(found.Start_Time__c)} – ${this.formatTime(found.End_Time__c)}`,
                serviceTypeName: found.Service_Type__r ? found.Service_Type__r.Name : '',
                serviceResourceName: found.Service_Resource__r ? found.Service_Resource__r.Name : ''
            };
        }
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.selectedAppointment = undefined;
    }

    openRecord() {
        if (!this.selectedAppointment) {
            return;
        }
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.selectedAppointment.Id,
                objectApiName: 'Appointment__c',
                actionName: 'view'
            }
        });
    }

    // ---------- Helpers ----------

    getMonday(inputDate) {
        const date = new Date(inputDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    formatDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // Apex Time fields serialize as "HH:mm:ss.SSSZ" (time-only, no date part).
    formatTime(timeStr) {
        if (!timeStr) {
            return '';
        }
        const [hh, mm] = timeStr.split(':');
        let hours = parseInt(hh, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) {
            hours = 12;
        }
        return `${hours}:${mm} ${ampm}`;
    }

    isSameDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    // Maps Status__c picklist values to CSS classes. Update this list (and the
    // matching classes in the .css file) to match your org's actual picklist values.
    statusClass(status) {
        if (!status) {
            return 'slot-none';
        }
        return 'slot-' + status.toLowerCase().replace(/\s+/g, '-');
    }

    reduceError(error) {
        if (Array.isArray(error?.body)) {
            return error.body.map((e) => e.message).join(', ');
        }
        if (typeof error?.body?.message === 'string') {
            return error.body.message;
        }
        return 'An unknown error occurred while loading appointments.';
    }
}
