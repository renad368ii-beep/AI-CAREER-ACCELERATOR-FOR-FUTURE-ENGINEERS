/**
 * Server-side controller for the appointmentCalendar LWC.
 *
 * Adapted to the org's CUSTOM data model (not standard Field Service):
 *   Object:  Appointment__c
 *     - Customer_Contact__c  Lookup(Contact)   -> matched against recordId
 *     - Appointment_Date__c  Date
 *     - Start_Time__c        Time
 *     - End_Time__c          Time
 *     - Status__c            Picklist
 *     - Notes__c             Long Text Area
 *     - Service_Type__c      Lookup(Service_Type__c)
 *     - Service_Resource__c  Lookup(Service_Resource__c)
 *
 * NOTE: If your object/field API names differ from the above (check the
 * "Details" tab in Object Manager to confirm), update the SOQL below to match.
 */
public with sharing class AppointmentCalendarController {

    @AuraEnabled(cacheable=true)
    public static List<Appointment__c> getAppointments(Id recordId, Date startDate, Date endDate) {
        if (startDate == null || endDate == null) {
            return new List<Appointment__c>();
        }

        // TEMPORARY DEMO MODE: ignoring recordId filter so any existing
        // Appointment__c in the date range shows up regardless of which
        // Contact it's linked to. Restore the "Customer_Contact__c = :recordId"
        // filter below once you've confirmed the correct Contact Id flow.
        List<Appointment__c> results = [
            SELECT Id,
                   Name,
                   Appointment_Date__c,
                   Start_Time__c,
                   End_Time__c,
                   Status__c,
                   Notes__c,
                   Customer_Contact__c,
                   Service_Type__c,
                   Service_Type__r.Name,
                   Service_Resource__c,
                   Service_Resource__r.Name
            FROM Appointment__c
            WHERE Appointment_Date__c >= :startDate
              AND Appointment_Date__c <= :endDate
            WITH SECURITY_ENFORCED
            ORDER BY Appointment_Date__c ASC, Start_Time__c ASC
        ];

        return results;
    }
}