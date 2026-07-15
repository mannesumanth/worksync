const cds = require("@sap/cds");

module.exports = cds.service.impl(async function (srv) {

    const { SKILL_CATEGORIES, SKILLS } = srv.entities;

    srv.before("DELETE", SKILL_CATEGORIES, async (req) => {
        const { ID } = req.data;

        const aSkills = await cds.run(
            SELECT.from(SKILLS).where({
                category_ID: ID
            })
        );

        if (aSkills.length > 0) {
            req.reject(
                400,
                "This category contains skills. Delete or move those skills before deleting the category."
            );
        }
    });

    const employeeHandler = require("./handlers/employee-handler");
    const projectHandler = require("./handlers/project-handler");
    const allocationHandler = require("./handlers/allocation-handler");
    const leaveHandler = require("./handlers/leave-handler");
    const recommendationHandler = require("./handlers/recommendation-handler");
    const spofHandler = require("./handlers/spof-handler");
    const forecastHandler = require("./handlers/forecast-handler");
    const dashboardHandler = require("./handlers/dashboard-handler");
    const notificationHandler = require("./handlers/notification-handler");

    employeeHandler.register(srv);
    projectHandler.register(srv);
    allocationHandler.register(srv);
    leaveHandler.register(srv);
    recommendationHandler.register(srv);
    spofHandler.register(srv);
    forecastHandler.register(srv);
    dashboardHandler.register(srv);
    notificationHandler.register(srv);

    srv.on("currentUser", (req) => {
        return {
            id: req.user.id,
            isAdmin: req.user.is("Admin"),
            isEmployee: req.user.is("Employee")
        };
    });

});