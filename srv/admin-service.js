const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {


    const employeeHandler = require("./handlers/employee-handler");
    const projectHandler = require("./handlers/project-handler");
    const allocationHandler = require("./handlers/allocation-handler");
    const leaveHandler = require("./handlers/leave-handler");
    const recommendationHandler = require("./handlers/recommendation-handler");
    const spofHandler = require("./handlers/spof-handler");
    const forecastHandler = require("./handlers/forecast-handler");
    const dashboardHandler = require("./handlers/dashboard-handler");
    const notificationHandler = require("./handlers/notification-handler");

    employeeHandler.register(this);
    projectHandler.register(this);
    allocationHandler.register(this);
    leaveHandler.register(this);
    recommendationHandler.register(this);
    spofHandler.register(this);
    forecastHandler.register(this); 
    dashboardHandler.register(this);
    notificationHandler.register(this);
});