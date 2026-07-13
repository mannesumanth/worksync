const cds = require("@sap/cds");

module.exports = {

    register(service) {

        const {
            EMPLOYEES,
            PROJECTS,
            ALLOCATIONS,
            LEAVE_CALENDAR,
            EMPLOYEE_SKILLS
        } = service.entities;

        service.on("GetNotifications", async (req) => {

            // Implementation

        });

    }

};