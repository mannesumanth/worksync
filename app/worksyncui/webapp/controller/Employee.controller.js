sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Core"
], function (Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, Core) {
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
            onToggleSideNavigation: function () {
                const oSideNav = this.byId("toggleNavigation");
                oSideNav.setExpanded(
                    !oSideNav.getExpanded()
                );

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
                        oNav.to(this.byId("profilePage"));
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
                const TOTAL_LEAVES = 20;
                aLeaves.forEach(function (oLeave) {

                    const iLeaveDays = this._getWeekDays(
                        oLeave.LEAVE_FROM,
                        oLeave.LEAVE_TO
                    );
                    switch (oLeave.STATUS) {
                        case "APPROVED":
                            used += iLeaveDays;
                            break;
                        case "PENDING":
                            pending += iLeaveDays;
                            break;
                    }
                }.bind(this));
                const oStats = {
                    available: TOTAL_LEAVES - used,
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
                const oPage = this.byId("leavesPage");

                try {
                    oPage.setBusy(true);
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
                    await this._loadLeaves();
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
                } finally {
                    oPage.setBusy(false);
                }
            },

            //Cancel Leave
            onCancelLeave: async function (oEvent) {
                try {
                    const oLeave = oEvent.getSource().getBindingContext("leaves").getObject();
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
            //Withdraw Leave
            onWithdrawLeave: async function (oEvent) {
                try {

                    const sLeaveId = oEvent.getSource()
                        .getBindingContext("leaves")
                        .getProperty("ID");

                    const oModel = this.getOwnerComponent().getModel("employee");
                    const oAction = oModel.bindContext("/WithdrawLeave(...)");
                    oAction.setParameter("leaveId", sLeaveId);
                    await oAction.execute();
                    MessageToast.show("Leave withdrawn successfully");
                    await this._loadLeaves();
                } catch (err) {
                    MessageBox.error(err.message);
                }

            },

            //Load Leave Calendar
            _loadLeaveCalendar: function (aLeaves) {
                const oCalendar = this.byId("leaveCalendar");
                oCalendar.destroySpecialDates();
                const mDateStatus = {};
                aLeaves.forEach(function (oLeave) {
                    let sType;
                    switch (oLeave.STATUS) {
                        case "APPROVED":
                            sType = "Type08";
                            break;
                        case "PENDING":
                            sType = "Type06";
                            break;
                        case "REJECTED":
                            sType = "Type11";
                            break;
                        default:
                            return;
                    }
                    let oCurrent = new Date(oLeave.LEAVE_FROM);
                    const oEnd = new Date(oLeave.LEAVE_TO);
                    while (oCurrent <= oEnd) {
                        if (oCurrent.getDay() !== 0 && oCurrent.getDay() !== 6) {
                            const sKey = oCurrent.toISOString().split("T")[0];
                            // overwrite previous status
                            mDateStatus[sKey] = sType;
                        }
                        oCurrent.setDate(oCurrent.getDate() + 1);
                    }
                });
                Object.keys(mDateStatus).forEach(function (sDate) {
                    oCalendar.addSpecialDate(
                        new sap.ui.unified.DateTypeRange({
                            startDate: new Date(sDate),
                            type: mDateStatus[sDate]
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
                    let iDays = 0;
                    let oCurrent = new Date(dFrom);
                    while (oCurrent <= dTo) {
                        const iDay = oCurrent.getDay(); // 0 = Sun, 6 = Sat
                        if (iDay !== 0 && iDay !== 6) {
                            iDays++;
                        }
                        oCurrent.setDate(oCurrent.getDate() + 1);
                    }
                    this.byId("leaveDays").setValue(iDays);
                }
            },
            // Theme Toggle
            onThemeToggle1: function (oEvent) {
                const bPressed = oEvent.getSource().getPressed();
                if (bPressed) {
                    Core.applyTheme("sap_horizon_dark");
                    oEvent.getSource().setText("Light Mode");
                    oEvent.getSource().setIcon("sap-icon://light-mode");
                } else {
                    Core.applyTheme("sap_horizon");
                    oEvent.getSource().setText("Dark Mode");
                    oEvent.getSource().setIcon("sap-icon://dark-mode");
                }
            },
            // Calculate weekdays between two dates (inclusive)
            _getWeekDays: function (sFrom, sTo) {

                let iDays = 0;
                let oCurrent = new Date(sFrom);
                const oEnd = new Date(sTo);
                while (oCurrent <= oEnd) {
                    const iDay = oCurrent.getDay();
                    // Exclude Saturday (6) and Sunday (0)
                    if (iDay !== 0 && iDay !== 6) {
                        iDays++;
                    }
                    oCurrent.setDate(oCurrent.getDate() + 1);
                }
                return iDays;
            },
        }
    );

});