const cds = require("@sap/cds");

const leaveBalanceHandler = require("./handlers/employee/leave-balance");
const leavesHandler = require("./handlers/employee/leaves");
const profileHandler = require("./handlers/employee/profile");
const projectsHandler = require("./handlers/employee/projects");
const skillsHandler = require("./handlers/employee/skills");

module.exports = cds.service.impl(function () {

    // Employee profile
    profileHandler(this);

    // Employee skills
    skillsHandler(this);

    // Employee projects & allocation history
    projectsHandler(this);

    // Employee leaves & leave actions
    leavesHandler(this);

    // Employee leave balance
    leaveBalanceHandler(this);

});