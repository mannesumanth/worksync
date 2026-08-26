const cds = require("@sap/cds");

const { LEAVE_CALENDAR } = cds.entities("worksync.db");

const {
    getCurrentEmployee
} = require("../../utils/employee");

const {
    getWeekDays,
    getOrCreateLeaveBalance,
    getUsedDaysForYear,
    LEAVE_TYPE_AVAILABLE_FIELD
} = require("../../utils/leave");

const {
    generateBusinessId
} = require("../../utils/id-generator");


module.exports = function (service) {

    // Read current employee leaves
    service.on("READ", "MyLeaves", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        req.query.where({
            employee_ID: employee.ID
        });
        const db = await cds.connect.to("db");
        const leaves = await db.run(req.query);
        leaves.forEach(leave => {
            leave.DAYS = getWeekDays(
                leave.LEAVE_FROM,
                leave.LEAVE_TO
            );
        });
        return leaves;
    });

    // Apply leave
    service.on("ApplyLeave", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        const {
            leaveType,
            leaveFrom,
            leaveTo,
            reason
        } = req.data;
        if (leaveFrom > leaveTo) {
            return req.reject(
                400,
                "Leave From date cannot be greater than Leave To date."
            );
        }
        const requestedDays = getWeekDays(
            leaveFrom,
            leaveTo
        );
        const availableField =
            LEAVE_TYPE_AVAILABLE_FIELD[leaveType];
        if (availableField) {
            const requestYear =
                new Date(leaveFrom).getFullYear();
            const balance =
                await getOrCreateLeaveBalance(
                    employee.ID,
                    requestYear
                );
            const usedDays =
                await getUsedDaysForYear(
                    employee.ID,
                    leaveType,
                    requestYear
                );
            const availableDays =
                balance[availableField] - usedDays;
            if (requestedDays > availableDays) {
                return req.reject(
                    400,
                    `You don't have enough ${leaveType} leave balance. You have only ${availableDays} day(s) remaining, but you requested ${requestedDays} day(s).`
                );
            }
        }
        const db = await cds.connect.to("db");
        // Check overlapping leave
        const existingLeave = await db.run(
            SELECT.one
                .from(LEAVE_CALENDAR)
                .where({
                    employee_ID: employee.ID
                })
                .where`
                    LEAVE_FROM <= ${leaveTo}
                    AND LEAVE_TO >= ${leaveFrom}
                    AND STATUS NOT IN (
                        'WITHDRAWN',
                        'REJECTED',
                        'CANCELLED'
                    )
                `
        );
        if (existingLeave) {
            return req.reject(
                400,
                `A leave already exists from ${existingLeave.LEAVE_FROM} to ${existingLeave.LEAVE_TO}.`
            );
        }
        const leaveId = await generateBusinessId(
            req,
            "LEAVE_SEQ",
            "LEV"
        );
        await db.run(
            INSERT.into(LEAVE_CALENDAR).entries({
                LEAVE_ID: leaveId,
                employee_ID: employee.ID,
                LEAVE_TYPE: leaveType,
                LEAVE_FROM: leaveFrom,
                LEAVE_TO: leaveTo,
                REASON: reason,
                STATUS: "PENDING"
            })
        );
        return {
            message: "Leave request submitted successfully"
        };
    });

    // Cancel leave
    service.on("CancelLeave", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        const db = await cds.connect.to("db");
        const leave = await db.run(
            SELECT.one
                .from(LEAVE_CALENDAR)
                .where({
                    ID: req.data.leaveId,
                    employee_ID: employee.ID
                })
        );
        if (!leave) {
            return req.reject(
                404,
                "Leave request not found."
            );
        }
        await db.run(
            UPDATE(LEAVE_CALENDAR)
                .set({
                    STATUS: "CANCELLED"
                })
                .where({
                    ID: req.data.leaveId,
                    employee_ID: employee.ID
                })
        );
        return {
            message: "Leave cancelled successfully"
        };
    });


    // Submit withdrawal request
    service.on("WithdrawLeave", async (req) => {
        const employee = await getCurrentEmployee(req);
        if (!employee) {
            return req.reject(404, "Employee not found.");
        }
        const db = await cds.connect.to("db");
        const leave = await db.run(
            SELECT.one
                .from(LEAVE_CALENDAR)
                .where({
                    ID: req.data.leaveId,
                    employee_ID: employee.ID
                })
        );
        if (!leave) {
            return req.reject(
                404,
                "Leave request not found."
            );
        }
        if (leave.STATUS === "WITHDRAW_REQUEST") {
            return req.reject(
                400,
                "A withdrawal request for this leave is already pending admin approval."
            );
        }
        if (leave.STATUS !== "APPROVED") {
            return req.reject(
                400,
                "Only approved leave requests can be withdrawn."
            );
        }
        await db.run(
            UPDATE(LEAVE_CALENDAR)
                .set({
                    STATUS: "WITHDRAW_REQUEST"
                })
                .where({
                    ID: req.data.leaveId,
                    employee_ID: employee.ID
                })
        );
        return {
            message:
                "Withdrawal request submitted. It will take effect once approved by an admin."
        };
    });
};