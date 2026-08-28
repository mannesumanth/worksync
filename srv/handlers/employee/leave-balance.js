const {
    getCurrentEmployee
} = require("../../utils/employee");

const {
    getOrCreateLeaveBalance,
    getUsedDaysForYear
} = require("../../utils/leave");

module.exports = function (service) {
    // Read current employee leave balance
    service.on("READ", "MyLeaveBalance", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        const year = new Date().getFullYear();
        const balance = await getOrCreateLeaveBalance( employee.ID, year);
        const casualUsed = await getUsedDaysForYear( employee.ID, "CASUAL", year );
        const sickUsed = await getUsedDaysForYear( employee.ID, "SICK", year );
        const earnedUsed = await getUsedDaysForYear( employee.ID, "EARNED", year);
        return [{
            ...balance,
            CASUAL_AVAILABLE: balance.CASUAL_AVAILABLE,
            CASUAL_USED: casualUsed,

            SICK_AVAILABLE: balance.SICK_AVAILABLE,
            SICK_USED: sickUsed,

            EARNED_AVAILABLE: balance.EARNED_AVAILABLE,
            EARNED_USED: earnedUsed,

            UNPAID_USED: balance.UNPAID_USED
        }];
    });
};