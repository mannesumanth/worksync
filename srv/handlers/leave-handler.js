const cds = require("@sap/cds");

module.exports = {
    register(service) {
        const { LEAVE_CALENDAR } = service.entities;

        // Generate Allocation ID   
        service.on('ApproveLeave', async (req) => {
            const { leaveId, status } = req.data;
            // Validate the status input
            if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
                return req.error(400, 'Status must be APPROVED, REJECTED or PENDING');
            }
            // Fetch the leave request from the database
            const oLeave = await cds.run(
                SELECT.one.from(LEAVE_CALENDAR).where({ ID: leaveId })
            );
            // If the leave request does not exist, return a 404 error
            if (!oLeave) {
                return req.error(404, `Leave request ${leaveId} not found`);
            }
            // Update the leave request status in the database
            await cds.run(
                UPDATE(LEAVE_CALENDAR)
                    .set({ STATUS: status })
                    .where({ ID: leaveId })
            );
            return { message: `Leave ${status.toLowerCase()} successfully` };
        });
    }
}