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
                    const response = await fetch(
                        "/odata/v4/employee/MyProfile"
                    );
                    const data = await response.json();
                    console.log("Full Response:", data);
                    console.log("Employee:", data.value[0]);
                    const oModel = new JSONModel(data.value[0]);
                    this.getView().setModel(oModel, "employee");
                } catch (error) {
                    console.error("Profile Load Error", error);

                }
            },
            //Load Projects
            _loadProjects: async function () {
                try {
                    const response = await fetch(
                        "/odata/v4/employee/MyProjects?$orderby=createdAt desc"
                    );
                    const data = await response.json();
                    console.log("Projects:", data);
                    this.getView().setModel(new JSONModel(data), "projects");
                } catch (error) {
                    console.error("Projects Load Error", error);
                }
            },

            //Load Skills
            _loadSkills: async function () {
                try {
                    const response = await fetch("/odata/v4/employee/MySkills");
                    const data = await response.json();
                    console.log("Skills:", data);
                    this.getView().setModel(new JSONModel(data), "skills");
                } catch (error) {
                    console.error("Skills Load Error", error);
                }
            },
            //Load Leaves
            _loadLeaves: async function () {
                try {
                    const response =
                        await fetch("/odata/v4/employee/MyLeaves");
                    const data = await response.json();
                    this.getView().setModel(new JSONModel(data), "leaves");
                    this._calculateLeaveStats(
                        data.value || []
                    );
                    this._loadLeaveCalendar(
                        data.value || []
                    );
                    console.log("Leaves:", data.value);
                } catch (error) {
                    console.error("Leaves Load Error", error);
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
                    const oDateFormat =
                        sap.ui.core.format.DateFormat.getDateInstance({
                            pattern: "yyyy-MM-dd"
                        });
                    const leaveFrom = oDateFormat.format(dFrom);
                    const leaveTo = oDateFormat.format(dTo);
                    const reason = this.byId("leaveReason").getValue();
                    if (
                        !leaveType ||
                        !leaveFrom ||
                        !leaveTo ||
                        !reason
                    ) {
                        MessageBox.error("Please fill all fields");
                        return;
                    }
                    const response = await fetch(
                        "/odata/v4/employee/ApplyLeave",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                leaveType,
                                leaveFrom,
                                leaveTo,
                                reason
                            })
                        }
                    );
                    if (!response.ok) {
                        throw new Error("Leave submission failed");
                    }
                    MessageToast.show("Leave applied successfully");
                    this.byId("leaveType").setSelectedKey("");
                    this.byId("leaveStartDate").setValue("");
                    this.byId("leaveEndDate").setValue("");
                    this.byId("leaveReason").setValue("");
                    this.byId("leaveDays").setValue("0");
                    this._loadLeaves();
                } catch (error) {
                    MessageBox.error(
                        error.message
                    );
                }
            },
            //Cancel Leave
            onCancelLeave: function () {
                MessageToast.show(
                    "Cancel Leave action not implemented yet"
                );
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

            //Cancel Leave
            onCancelLeave: async function (oEvent) {
                try {
                    const oLeave =
                        oEvent.getSource()
                            .getBindingContext("leaves")
                            .getObject();
                    const response = await fetch(
                        "/odata/v4/employee/CancelLeave",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                leaveId: oLeave.ID
                            })
                        }
                    );
                    if (!response.ok) {
                        throw new Error("Failed to cancel leave");
                    }
                    MessageToast.show("Leave cancelled successfully");
                    this._loadLeaves();
                } catch (error) {
                    MessageBox.error(
                        error.message
                    );
                }
            },
        }
    );

});