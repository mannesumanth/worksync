sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend(
        "com.amista.worksyncui.controller.Employee",
        {
            onInit: function () {
                this._loadProfile();
                this._loadLeaves();
                this._loadProjects();
                this._loadSkills();

            },
            onToggleNavigation: function () {
                const oToolPage = this.byId("employeeToolPage");
                oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
            },
            onMenuSelect: function (oEvent) {
                const sKey = oEvent.getParameter("item").getKey();
                const oNav = this.byId("employeeNavContainer");
                switch (sKey) {
                    case "profile":
                        oNav.to(this.byId("profilePage"));
                        break;
                    case "projects":
                        oNav.to(this.byId("projectsPage"));
                        break;
                    case "skills":
                        oNav.to(this.byId("skillsPage"));
                        break;
                    case "leaves":
                        oNav.to(this.byId("leavesPage"));
                        break;
                    default:
                        oNav.to(this.byId("empdashboardPage"));
                }
            },
            //Load Profile
           _loadProfile: async function () {
    try {
        const oModel = this.getOwnerComponent().getModel("employee");

        const aContexts = await oModel
            .bindList("/MyProfile")
            .requestContexts(0, 1);

        if (aContexts.length) {
            this.getView().setBindingContext(aContexts[0], "employee");
        }

    } catch (err) {
        console.error("Profile Load Error", err);
    }
},
            //Load Projects
            _loadProjects: async function () {

    try {

        const oModel = this.getOwnerComponent().getModel("employee");

        const aContexts = await oModel
            .bindList("/MyProjects")
            .requestContexts();

        this.getView().setModel(
            new sap.ui.model.json.JSONModel({
                value: aContexts.map(c => c.getObject())
            }),
            "projects"
        );

    } catch (err) {

        console.error(err);

    }

},

            //Load Skills
            _loadSkills: async function () {

    try {

        const oModel = this.getOwnerComponent().getModel("employee");

        const aContexts = await oModel
            .bindList("/MySkills")
            .requestContexts();

        this.getView().setModel(
            new sap.ui.model.json.JSONModel({
                value: aContexts.map(c => c.getObject())
            }),
            "skills"
        );

    } catch (err) {

        console.error(err);

    }

},
            //Load Leave
            _loadLeaves: async function () {

    try {

        const oModel = this.getOwnerComponent().getModel("employee");

        const aContexts = await oModel
            .bindList("/MyLeaves")
            .requestContexts();

        const aLeaves = aContexts.map(c => c.getObject());

        this.getView().setModel(
            new sap.ui.model.json.JSONModel({
                value: aLeaves
            }),
            "leaves"
        );

        this._calculateLeaveStats(aLeaves);
        this._loadLeaveCalendar(aLeaves);

    } catch (err) {

        console.error(err);

    }

},
            //Calculate Leave Stats
            _calculateLeaveStats: function (aLeaves) {
                let used = 0;
                let pending = 0;
                aLeaves.forEach(function (oLeave) {
                    if (oLeave.STATUS === "APPROVED") {
                        used++;
                    }
                    if (oLeave.STATUS === "PENDING") {
                        pending++;
                    }
                });
                const oStats = {
                    available: 20 - used,
                    used: used,
                    pending: pending

                };
                this.getView().setModel(
                    new JSONModel(oStats),
                    "leaveStats"
                );
            },

            //Leave Status Formatter
            leaveStatusFormatter: function (sStatus) {
                switch (sStatus) {
                    case "APPROVED":
                        return "Success";
                    case "REJECTED":
                        return "Error";
                    case "PENDING":
                        return "Warning";
                    default:
                        return "None";
                }
            },
            //Apply Leave
            onApplyLeave: async function () {

    try {

        const leaveType = this.byId("leaveType").getSelectedKey();
        const dFrom = this.byId("leaveStartDate").getDateValue();
        const dTo = this.byId("leaveEndDate").getDateValue();
        const reason = this.byId("leaveReason").getValue();

        if (!leaveType || !dFrom || !dTo || !reason) {
            MessageBox.error("Please fill all fields");
            return;
        }

        const oFormat = sap.ui.core.format.DateFormat.getDateInstance({
            pattern: "yyyy-MM-dd"
        });

        const oModel = this.getOwnerComponent().getModel("employee");

        const oAction = oModel.bindContext("/ApplyLeave(...)");

        oAction.setParameter("leaveType", leaveType);
        oAction.setParameter("leaveFrom", oFormat.format(dFrom));
        oAction.setParameter("leaveTo", oFormat.format(dTo));
        oAction.setParameter("reason", reason);

        await oAction.execute();

        MessageToast.show("Leave applied successfully");

        this.byId("leaveType").setSelectedKey("");
        this.byId("leaveStartDate").setValue("");
        this.byId("leaveEndDate").setValue("");
        this.byId("leaveReason").setValue("");
        this.byId("leaveDays").setValue("");

        await this._loadLeaves();

    } catch (err) {

        console.error(err);
        MessageBox.error(err.message || "Unable to apply leave");

    }
},
            //Cancel Leave
            onCancelLeave: async function (oEvent) {

    try {

        const oLeave = oEvent.getSource()
            .getBindingContext("leaves")
            .getObject();

        const oModel = this.getOwnerComponent().getModel("employee");

        const oAction = oModel.bindContext("/CancelLeave(...)");

        oAction.setParameter("leaveId", oLeave.ID);

        await oAction.execute();

        MessageToast.show("Leave cancelled successfully");

        await this._loadLeaves();

    } catch (err) {

        console.error(err);
        MessageBox.error(err.message || "Unable to cancel leave");

    }

},
            //Load Leave Calendar
            _loadLeaveCalendar: function (aLeaves) {
                const oCalendar =
                    this.byId("leaveCalendar");
                oCalendar.destroySpecialDates();
                aLeaves.forEach(function (oLeave) {
                    let sType = "Type01";
                    switch (oLeave.STATUS) {
                        case "APPROVED":
                            sType = "Type08";
                            break;
                        case "PENDING":
                            sType = "Type01";
                            break;
                        case "REJECTED":
                            sType = "Type11";
                            break;
                        case "CANCELLED":
                            sType = "None";
                            break;
                        default:
                            sType = "None";
                    }
                    oCalendar.addSpecialDate(
                        new sap.ui.unified.DateTypeRange({
                            startDate:
                                new Date(oLeave.LEAVE_FROM),
                            endDate:
                                new Date(oLeave.LEAVE_TO),
                            type: sType
                        })
                    );
                });
            },
            //Calculate Leave Days
            onLeaveDateChange: function () {
                const oFrom = this.byId("leaveStartDate");
                const oTo = this.byId("leaveEndDate");
                if (!oFrom || !oTo) {
                    console.error("DatePicker not found");
                    return;
                }
                const dFrom = oFrom.getDateValue();
                const dTo = oTo.getDateValue();
                // Check if a date falls on a weekend
                const isWeekend = function (date) {
                    const day = date.getDay(); // Sunday = 0, Saturday = 6
                    return day === 0 || day === 6;
                };
                // Validate From Date
                if (dFrom && isWeekend(dFrom)) {
                    MessageBox.error("Leave cannot be applied on Saturday or Sunday.");
                    oFrom.setValue("");
                    this.byId("leaveDays").setValue("");
                    return;
                }
                // Validate To Date
                if (dTo && isWeekend(dTo)) {
                    MessageBox.error("Leave cannot be applied on Saturday or Sunday.");
                    oTo.setValue("");
                    this.byId("leaveDays").setValue("");
                    return;
                }
                // Calculate total days
                if (dFrom && dTo) {
                    if (dFrom > dTo) {
                        MessageBox.error("From Date cannot be greater than To Date.");
                        this.byId("leaveDays").setValue("");
                        return;
                    }
                    const iDays = Math.floor(
                        (dTo.getTime() - dFrom.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1;
                    this.byId("leaveDays").setValue(iDays);
                }
            },
        }
    );

});