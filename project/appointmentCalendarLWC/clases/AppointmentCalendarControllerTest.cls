@isTest
private class AppointmentCalendarControllerTest {

    @isTest
    static void testGetAppointments_returnsScopedRecords() {
        Contact con = new Contact(LastName = 'Test Customer');
        insert con;

        Appointment__c appt = new Appointment__c(
            Customer_Contact__c = con.Id,
            Appointment_Date__c = Date.today(),
            Start_Time__c = Time.newInstance(9, 0, 0, 0),
            End_Time__c = Time.newInstance(10, 0, 0, 0),
            Status__c = 'Scheduled',
            Notes__c = 'Test note'
        );
        insert appt;

        Test.startTest();
        List<Appointment__c> results = AppointmentCalendarController.getAppointments(
            con.Id, Date.today().addDays(-1), Date.today().addDays(1)
        );
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Expected exactly one appointment in range');
        System.assertEquals('Scheduled', results[0].Status__c);
    }

    @isTest
    static void testGetAppointments_nullInputsReturnEmptyList() {
        List<Appointment__c> results = AppointmentCalendarController.getAppointments(null, null, null);
        System.assertEquals(0, results.size());
    }
}
