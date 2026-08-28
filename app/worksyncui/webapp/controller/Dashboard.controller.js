sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    MessageToast
) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.Dashboard", {

        onInit: function () {

            // Dashboard KPIs
            this.getView().setModel(new JSONModel({
                totalEmployees: 0,
                availableEmployees: 0,
                benchEmployees: 0,
                underAllocatedEmployees: 0,
                fullyAllocatedEmployees: 0,
                overAllocatedEmployees: 0,

                totalProjects: 0,
                activeProjects: 0,
                upcomingProjects: 0,
                completedProjects: 0,
                onHoldProjects: 0,

                totalAllocations: 0,
                averageUtilization: 0,

                totalLeaves: 0,
                pendingLeaves: 0,
                approvedLeaves: 0,
                rejectedLeaves: 0,

                totalSkills: 0,
                totalDesignations: 0,

                spofCount: 0,
                spofPercent: 0
            }), "dash");

            // Availability Chart
            this.getView().setModel(
                new JSONModel({ data: [] }),
                "availabilityChart"
            );

            // Employee Allocation Chart
            this.getView().setModel(
                new JSONModel({ data: [] }),
                "employeeChart"
            );

            // Project Status Chart
            this.getView().setModel(
                new JSONModel({ data: [] }),
                "projectChart"
            );

            // Leave Chart
            this.getView().setModel(
                new JSONModel({ data: [] }),
                "leaveChart"
            );

            // Forecast Model
            this.getView().setModel(
                new JSONModel({
                    currentMonthAvailable: 0,
                    nextMonthAvailable: 0,
                    currentMonthLeaves: 0,
                    nextMonthLeaves: 0,
                    pendingLeaves: 0
                }),
                "forecast"
            );

            // SPOF Chart
            this.getView().setModel(
                new JSONModel({ data: [] }),
                "spofChart"
            );

            sap.ui.getCore().getEventBus().subscribe(
                "Dashboard",
                "Refresh",
                this._onDashboardRefresh,
                this
            );

            this._configureCharts();
            this._loadDashboardStats();
            this._loadAvailabilityForecast();
            this._loadSpofRisks();
        },

        _onDashboardRefresh: function () {
            this._configureCharts();
            this._loadDashboardStats();
            this._loadAvailabilityForecast();
            this._loadSpofRisks();
        },

        onExit: function () {
            sap.ui.getCore().getEventBus().unsubscribe(
                "Dashboard",
                "Refresh",
                this._onDashboardRefresh,
                this
            );
        },
        onTilePress: function (oEvent) {
            const sKey = oEvent.getSource().data("nav");
            this.getOwnerComponent().getRouter().navTo(sKey);
        },

        _loadDashboardStats: async function () {

            try {

                const oAction = this.getOwnerComponent()
                    .getModel()
                    .bindContext("/GetDashboardStats(...)");

                await oAction.invoke();

                const oStats = oAction
                    .getBoundContext()
                    .getObject();

                // Dashboard KPIs
                this.getView()
                    .getModel("dash")
                    .setData(oStats);

                // Employee Allocation Chart
                this.getView()
                    .getModel("employeeChart")
                    .setData({
                        data: [
                            {
                                Group: "Employees",
                                Bench: oStats.benchEmployees,
                                UnderAllocated: oStats.underAllocatedEmployees,
                                FullyAllocated: oStats.fullyAllocatedEmployees
                            }
                        ]
                    });
                // Project Status Chart
                this.getView()
                    .getModel("projectChart")
                    .setData({
                        data: [
                            {
                                Status: "Active",
                                Count: oStats.activeProjects
                            },
                            {
                                Status: "Completed",
                                Count: oStats.completedProjects
                            },
                            {
                                Status: "Upcoming",
                                Count: oStats.upcomingProjects
                            },
                            {
                                Status: "On Hold",
                                Count: oStats.onHoldProjects
                            }
                        ]
                    });

                // Leave Chart
                // Leave Chart
                this.getView().getModel("leaveChart").setData({
                    data: [
                        {
                            Status: "Pending",
                            Count: oStats.pendingLeaves
                        },
                        {
                            Status: "Approved",
                            Count: oStats.approvedLeaves
                        },
                        {
                            Status: "Rejected",
                            Count: oStats.rejectedLeaves
                        },
                        {
                            Status: "Cancelled",
                            Count: oStats.cancelledLeaves
                        },
                        {
                            Status: "Withdrawn",
                            Count: oStats.withdrawnLeaves
                        },
                        {
                            Status: "Withdrawal Request",
                            Count: oStats.withdrawalRequestLeaves
                        }
                    ]
                });
            } catch (oError) {
                console.error(oError);
                MessageToast.show("Failed to load dashboard statistics");
            }
        },

        _loadAvailabilityForecast: async function () {

            try {
                const oAction = this.getOwnerComponent()
                    .getModel()
                    .bindContext("/GetAvailabilityForecast(...)")
                await oAction.invoke();
                const oData = oAction
                    .getBoundContext()
                    .getObject();
                this.getView()
                    .getModel("forecast")
                    .setData(oData);
                this.getView()
                    .getModel("availabilityChart")
                    .setData({
                        data: [
                            {
                                Month: "Current",
                                Available: oData.currentMonthAvailable
                            },
                            {
                                Month: "Next",
                                Available: oData.nextMonthAvailable
                            }
                        ]
                    });
            } catch (oError) {
                console.error(oError);
                MessageToast.show("Failed to load availability forecast");
            }
        },

        _loadSpofRisks: async function () {
            try {
                const oAction = this.getOwnerComponent()
                    .getModel()
                    .bindContext("/DetectSPOF(...)");

                await oAction.invoke();

                const aRisks =
                    oAction
                        .getBoundContext()
                        .getObject()
                        .value || [];

                const oDash = this.getView().getModel("dash");
                const nSkill = oDash.getProperty("/totalSkills");

                oDash.setProperty("/spofCount", aRisks.length);

                oDash.setProperty(
                    "/spofPercent",
                    nSkill > 0
                        ? Math.round((aRisks.length / nSkill) * 100)
                        : 0
                );

                this.getView()
                    .getModel("spofChart")
                    .setData({
                        data: [
                            {
                                Category: "Spof Risks",
                                Count: aRisks.length
                            },
                            {
                                Category: "Healthy",
                                Count: Math.max(nSkill - aRisks.length, 0)
                            }
                        ]
                    });

            } catch (oError) {
                console.error(oError);
                MessageToast.show("Failed to load SPOF risks");
            }
        },


        _configureCharts: function () {
            const aCharts = [
                this.byId("projectChartViz"),
                this.byId("availabilityChartViz"),
                this.byId("vizSpofRisk")
            ];
            this.byId("leaveChartViz").setVizProperties({
                title: {
                    visible: false
                },
                legend: {
                    visible: true,
                    position: "bottom"

                },
                plotArea: {
                    dataLabel: {
                        visible: true,
                        type: "value"
                    },
                    colorPalette: [
                        "#f67a1c", // Pending
                        "#107E3E", // Approved
                        "#BB0000", // Rejected
                        "#6A6D70", // Cancelled
                        "#5E35B1", // Withdrawn
                        "#0A6ED1"  // Withdrawal Request
                    ]
                }
            });
            this.byId("employeeChartViz").setVizProperties({
                title: {
                    visible: false
                },
                legend: {
                    visible: true,
                },
                plotArea: {
                    dataLabel: {
                        visible: true,
                        type: "value"
                    },
                    colorPalette: [
                        "#0A6ED1", // Bench
                        "#E9730C", // Under Allocated
                        "#107E3E", // Fully Allocated
                    ]
                }
            });
            aCharts.forEach(function (oChart) {
                if (!oChart) {
                    return;
                }
                oChart.setVizProperties({
                    title: {
                        visible: false
                    },
                    legend: {
                        visible: true,
                        position: "bottom"
                    },
                    plotArea: {
                        dataLabel: {
                            visible: true,
                            type: "value"
                        }
                    }

                });

            });

        },


    });

});