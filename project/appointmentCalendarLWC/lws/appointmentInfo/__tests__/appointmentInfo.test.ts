import { createElement } from '@lwc/engine-dom';
import AppointmentInfo from 'c/appointmentInfo';

describe('c-appointment-info', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders component', () => {
        const element = createElement('c-appointment-info', {
            is: AppointmentInfo
        });
        document.body.appendChild(element);
        expect(1).toBe(1);
    });
});
