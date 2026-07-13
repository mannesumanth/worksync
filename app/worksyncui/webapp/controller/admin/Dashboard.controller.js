sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast
) {
    "use strict";
    return Controller.extend("com.amista.worksyncui.controller.admin.Dashboard", {
        onInit: function () {
            this.getView().setModel(new JSONModel({
                empCount: 0,
                projCount: 0,
                allocCount: 0,
                leaveCount: 0,
                skillCount: 0,
                spofCount: 0,
                spofPercent: 0,
                leavePending: 0,
                leaveApproved: 0,
                leaveRejected: 0
            }), "dash");

            this.getView().setModel(
                new JSONModel({
                    data: []
                }),
                "availabilityChart"
            );

            this.getView().setModel(new JSONModel({
                currentMonthAvailable: 0,
                nextMonthAvailable: 0,
                currentMonthLeaves: 0,
                nextMonthLeaves: 0,
                pendingLeaves: 0
            }), "forecast");

            this._loadDashboardCounts();
            this._loadLeaveBreakdown();
            this._loadAvailabilityForecast();


        },

        onTilePress: function (oEvent) {
            const sKey = oEvent.getSource().data("nav");
            this.getOwnerComponent()
                .getRouter()
                .navTo(sKey);
        },

        _loadDashboardCounts: async function () {
            const oModel = this.getView().getModel();
            const _count = async (sPath) => {
                try {
                    const aCtx = await oModel
                        .bindList(sPath)
                        .requestContexts(0, 9999);
                    return aCtx.length;
                } catch (e) {
                    return 0;
                }
            };

            const [
                nEmp,
                nProj,
                nAlloc,
                nLeave,
                nSkill
            ] = await Promise.all([
                _count("/EMPLOYEES"),
                _count("/PROJECTS"),
                _count("/ALLOCATIONS"),
                _count("/LEAVE_CALENDAR"),
                _count("/SKILLS")
            ]);

            // NOTE: removed the this.byId("tileXxxCount").setValue(...) calls —
            // those control IDs don't exist in the view (the cards use ObjectNumber
            // bound to the "dash" model instead), and calling .setValue on
            // undefined was throwing and silently aborting the rest of this function.

            const oDash = this.getView().getModel("dash");
            oDash.setProperty("/empCount", nEmp);
            oDash.setProperty("/projCount", nProj);
            oDash.setProperty("/allocCount", nAlloc);
            oDash.setProperty("/leaveCount", nLeave);
            oDash.setProperty("/skillCount", nSkill);

            try {
                const oAction = oModel.bindContext("/DetectSPOF(...)");
                await oAction.invoke();
                const aSpof = oAction.getBoundContext().getObject().value || [];
                oDash.setProperty("/spofCount", aSpof.length);
                oDash.setProperty(
                    "/spofPercent",
                    nSkill > 0 ? Math.round((aSpof.length / nSkill) * 100) : 0
                );
            } catch (e) {
                console.error(e);
            }
        },

        _loadLeaveBreakdown: async function () {
            const oModel = this.getView().getModel();
            const countStatus = async (status) => {
                const aCtx = await oModel
                    .bindList("/LEAVE_CALENDAR", null, null, [
                        new Filter(
                            "STATUS",
                            FilterOperator.EQ,
                            status
                        )
                    ])
                    .requestContexts(0, 9999);
                return aCtx.length;
            };
            const [
                pending,
                approved,
                rejected
            ] = await Promise.all([
                countStatus("PENDING"),
                countStatus("APPROVED"),
                countStatus("REJECTED")
            ]);
            const oDash = this.getView().getModel("dash");
            oDash.setProperty("/leavePending", pending);
            oDash.setProperty("/leaveApproved", approved);
            oDash.setProperty("/leaveRejected", rejected);
        },

        _loadAvailabilityForecast: async function () {
            try {
                const oAction =
                    this.getView()
                        .getModel()
                        .bindContext("/GetAvailabilityForecast(...)");
                await oAction.invoke();
                const oData = oAction.getBoundContext().getObject();

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
            } catch (e) {
                console.error(e);
            }
        },
        onLoadSpofRisks: async function () {
            try {
                const oAction =
                    this.getView()
                        .getModel()
                        .bindContext("/DetectSPOF(...)");
                await oAction.invoke();
                const aRisks = oAction.getBoundContext().getObject().value || [];
                const oDash = this.getView().getModel("dash");
                const nSkill = oDash.getProperty("/skillCount");

                oDash.setProperty("/spofCount", aRisks.length);
                oDash.setProperty(
                    "/spofPercent",
                    nSkill > 0
                        ? Math.round((aRisks.length / nSkill) * 100)
                        : 0
                );
            } catch (e) {
                console.error(e);
            }
        }
    });
});