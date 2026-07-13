const cds = require("@sap/cds");

module.exports = {
    register(service) {
        const { LEAVE_CALENDAR } = service.entities;

        // Generate Allocation ID   
        service.on('ApproveLeave', async (req) => {
            const { leaveId, status } = req.data;

            if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
                return req.error(400, 'Status must be APPROVED, REJECTED or PENDING');
            }
            const oLeave = await cds.run(
                SELECT.one.from(LEAVE_CALENDAR).where({ ID: leaveId })
            );
            if (!oLeave) {
                return req.error(404, `Leave request ${leaveId} not found`);
            }
            if (oLeave.STATUS !== 'PENDING') {
                return req.error(400, `Leave request is already ${oLeave.STATUS}`);
            }
            await cds.run(
                UPDATE(LEAVE_CALENDAR)
                    .set({ STATUS: status })
                    .where({ ID: leaveId })
            );
            return { message: `Leave ${status.toLowerCase()} successfully` };
        });
    }
}