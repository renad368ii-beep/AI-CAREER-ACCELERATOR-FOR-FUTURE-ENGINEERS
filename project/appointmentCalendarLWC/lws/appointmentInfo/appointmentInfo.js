import { LightningElement, api } from 'lwc';

export default class AppointmentInfo extends LightningElement {
    @api appointment;

    get hasAppointment() {
        return this.appointment !== null && this.appointment !== undefined;
    }
}
