const cds = require("@sap/cds");
const db = cds.connect.to("db");

const {
    LEAVE_BALANCE,
    LEAVE_CALENDAR
} = cds.entities("worksync.db");

// These statuses are considered as occupying the employee's leave balance.
const RESERVED_STATUSES = [
    "APPROVED",
    "WITHDRAW_REQUEST"
];

// Only CASUAL, SICK and EARNED leaves have a limited yearly quota.
// Example:
// CASUAL_AVAILABLE = 12
// CASUAL_USED      = 5
// UNPAID (Loss of Pay), MATERNITY and PATERNITY do not have an
// AVAILABLE field in LEAVE_BALANCE, so they are not included here.
const LEAVE_TYPE_AVAILABLE_FIELD = {
    CASUAL: "CASUAL_AVAILABLE",
    SICK: "SICK_AVAILABLE",
    EARNED: "EARNED_AVAILABLE"
};
/***Finds the leave balance for a particular employee and year.
 If the employee does not have a leave balance for that year,
 a new record is created with the default yearly allocation.***/
async function getOrCreateLeaveBalance(employeeId, year) {
    const database = await db;
    let balance = await database.run(
        SELECT.one
            .from(LEAVE_BALANCE)
            .where({
                employee_ID: employeeId,
                YEAR: year
            })
    );
    // If no balance exists, create the balance for the year.
    if (!balance) {
        await database.run(
            INSERT.into(LEAVE_BALANCE).entries({
                // Employee to whom this balance belongs.
                employee_ID: employeeId,
                YEAR: year,
                CASUAL_AVAILABLE: 12,
                CASUAL_USED: 0,
                SICK_AVAILABLE: 12,
                SICK_USED: 0,
                EARNED_AVAILABLE: 12,
                EARNED_USED: 0,
                UNPAID_USED: 0
            })
        );
        // Fetch the newly created balance so that the function
        // always returns the complete balance object.
        balance = await database.run(
            SELECT.one
                .from(LEAVE_BALANCE)
                .where({
                    employee_ID: employeeId,
                    YEAR: year
                })
        );
    }
    return balance;
}
// Calculates the number of working days between two dates.
// Saturday and Sunday are excluded.
function getWeekDays(from, to) {
    let days = 0;
    let current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) {
            days++;
        }
        current.setDate(current.getDate() + 1);
    }
    return days;
}
/*** Calculates how many leave days an employee has already used
for a particular leave type in a particular year.
Only APPROVED and WITHDRAW_REQUEST leaves are counted because those statuses
reserve the employee's leave balance.*/
async function getUsedDaysForYear(
    employeeId,
    leaveType,
    year
) {
    const database = await db;
    // Fetch all leaves for this employee and leave type.
    const rows = await database.run(
        SELECT.from(LEAVE_CALENDAR)
            .columns(
                "LEAVE_FROM",
                "LEAVE_TO",
                "STATUS"
            )
            .where({
                employee_ID: employeeId,
                LEAVE_TYPE: leaveType
            })
    );

    let usedDays = 0;
    // Check every leave returned from the database.
    for (const leave of rows) {
        const leaveYear = new Date(leave.LEAVE_FROM).getFullYear();
        if (
            leaveYear === year &&
            RESERVED_STATUSES.includes(leave.STATUS)
        ) {
            // Add only working days.
            usedDays += getWeekDays(
                leave.LEAVE_FROM,
                leave.LEAVE_TO
            );
        }
    }
    return usedDays;
}
// These functions can now be imported and reused by different
// employee handlers.
module.exports = {
    getOrCreateLeaveBalance,
    getWeekDays,
    getUsedDaysForYear,
    LEAVE_TYPE_AVAILABLE_FIELD,
    RESERVED_STATUSES
};