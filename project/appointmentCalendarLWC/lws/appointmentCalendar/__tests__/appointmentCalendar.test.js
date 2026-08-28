import { createElement } from '@lwc/engine-dom';
import AppointmentCalendar from 'c/appointmentCalendar';
import getAppointments from '@salesforce/apex/AppointmentCalendarController.getAppointments';

// sfdx-lwc-jest provides createApexTestWireAdapter to simulate @wire(getAppointments, ...)
jest.mock(
    '@salesforce/apex/AppointmentCalendarController.getAppointments',
    () => {
        const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
        return {
            default: createApexTestWireAdapter(jest.fn())
        };
    },
    { virtual: true }
);

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

// Build a mock Appointment__c scheduled for "today" so it lands in the
// current week's grid regardless of what day the test suite runs on.
function buildMockAppointment() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    return [
        {
            Id: 'a0X000000000001EAA',
            Name: 'APT-0001',
            Appointment_Date__c: dateStr,
            Start_Time__c: '09:00:00.000Z',
            End_Time__c: '10:00:00.000Z',
            Status__c: 'Scheduled',
            Notes__c: 'First visit',
            Customer_Contact__c: '003000000000001AAA',
            Service_Type__c: 'a01000000000001AAA',
            Service_Type__r: { Name: 'Site Inspection' },
            Service_Resource__c: 'a02000000000001AAA',
            Service_Resource__r: { Name: 'John Smith' }
        }
    ];
}

describe('c-appointment-calendar', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders the default card title', () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);

        const card = element.shadowRoot.querySelector('lightning-card');
        expect(card.title).toBe('Appointment Calendar');
    });

    it('honors a custom cardTitle passed in via App Builder property', () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        element.cardTitle = 'My Team Schedule';
        document.body.appendChild(element);

        const card = element.shadowRoot.querySelector('lightning-card');
        expect(card.title).toBe('My Team Schedule');
    });

    it('shows an empty-state message when Apex returns no appointments', async () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);

        getAppointments.emit([]);
        await flushPromises();

        const emptyState = element.shadowRoot.querySelector(
            '.slds-text-body_regular.slds-text-color_weak'
        );
        expect(emptyState).not.toBeNull();
        expect(emptyState.textContent).toBe('No appointments scheduled for this week.');
    });

    it('renders an appointment slot with name, time, and status once Apex data arrives', async () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);

        getAppointments.emit(buildMockAppointment());
        await flushPromises();

        const subjectEl = element.shadowRoot.querySelector('.slot-subject');
        const statusEl = element.shadowRoot.querySelector('.slot-status');

        expect(subjectEl).not.toBeNull();
        expect(subjectEl.textContent).toBe('APT-0001');
        expect(statusEl.textContent).toBe('Scheduled');
    });

    it('applies a status-specific CSS class to the slot', async () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);

        getAppointments.emit(buildMockAppointment());
        await flushPromises();

        const slot = element.shadowRoot.querySelector('[data-id="a0X000000000001EAA"]');
        expect(slot.classList.contains('slot-scheduled')).toBe(true);
    });

    it('updates the visible week range label when navigating forward and back', async () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);
        await flushPromises();

        const rangeLabel = element.shadowRoot.querySelector('.cal-range-label');
        const initialLabel = rangeLabel.textContent;

        const nextButton = element.shadowRoot.querySelector(
            'lightning-button-icon[icon-name="utility:chevronright"]'
        );
        nextButton.click();
        await flushPromises();

        expect(rangeLabel.textContent).not.toBe(initialLabel);

        const prevButton = element.shadowRoot.querySelector(
            'lightning-button-icon[icon-name="utility:chevronleft"]'
        );
        prevButton.click();
        await flushPromises();

        expect(rangeLabel.textContent).toBe(initialLabel);
    });

    it('returns to the current week when "Today" is clicked after navigating away', async () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);
        await flushPromises();

        const rangeLabel = element.shadowRoot.querySelector('.cal-range-label');
        const initialLabel = rangeLabel.textContent;

        const nextButton = element.shadowRoot.querySelector(
            'lightning-button-icon[icon-name="utility:chevronright"]'
        );
        nextButton.click();
        nextButton.click();
        await flushPromises();
        expect(rangeLabel.textContent).not.toBe(initialLabel);

        const todayButton = element.shadowRoot.querySelector('lightning-button[label="Today"]');
        todayButton.click();
        await flushPromises();

        expect(rangeLabel.textContent).toBe(initialLabel);
    });

    it('opens the detail modal when an appointment slot is clicked', async () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);

        getAppointments.emit(buildMockAppointment());
        await flushPromises();

        expect(element.shadowRoot.querySelector('section[role="dialog"]')).toBeNull();

        const slot = element.shadowRoot.querySelector('[data-id="a0X000000000001EAA"]');
        slot.click();
        await flushPromises();

        const modal = element.shadowRoot.querySelector('section[role="dialog"]');
        expect(modal).not.toBeNull();
        expect(modal.textContent).toContain('APT-0001');
        expect(modal.textContent).toContain('Site Inspection');
        expect(modal.textContent).toContain('John Smith');
    });

    it('closes the detail modal when Close is clicked', async () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);

        getAppointments.emit(buildMockAppointment());
        await flushPromises();

        element.shadowRoot.querySelector('[data-id="a0X000000000001EAA"]').click();
        await flushPromises();
        expect(element.shadowRoot.querySelector('section[role="dialog"]')).not.toBeNull();

        const closeButton = element.shadowRoot.querySelector('footer lightning-button[label="Close"]');
        closeButton.click();
        await flushPromises();

        expect(element.shadowRoot.querySelector('section[role="dialog"]')).toBeNull();
    });

    it('displays an error message when the wire adapter errors out', async () => {
        const element = createElement('c-appointment-calendar', {
            is: AppointmentCalendar
        });
        document.body.appendChild(element);

        getAppointments.error({
            body: { message: 'Insufficient access rights on Appointment__c' }
        });
        await flushPromises();

        const errorEl = element.shadowRoot.querySelector('.slds-text-color_error');
        expect(errorEl).not.toBeNull();
        expect(errorEl.textContent).toBe('Insufficient access rights on Appointment__c');
    });
});
