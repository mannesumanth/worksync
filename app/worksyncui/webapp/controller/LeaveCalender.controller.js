sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"]
    , function (
        Controller,
        Filter,
        FilterOperator
    ) {
        "use strict";

        return Controller.extend("com.amista.worksyncui.controller.LeaveCalender", {
            onInit: function () {
                sap.ui.getCore().getEventBus().subscribe(
                    "Leaves","Refresh", 
                    this._onLeaveRefresh, 
                    this
                );
            },
            _onLeaveRefresh: function () {
                this.getView().getModel().refresh();
            },
            onExit: function () {
                sap.ui.getCore().getEventBus().unsubscribe(
                    "Leaves","Refresh", 
                    this._onLeaveRefresh, 
                    this
                );
            },
            onApproveLeave: function (oEvent) {
                const oLeave =
                    oEvent.getSource().getBindingContext().getObject();
                this._updateLeaveStatus(
                    oLeave.ID,
                    "APPROVED"
                );
            },
            onRejectLeave: function (oEvent) {
                const oLeave = oEvent.getSource().getBindingContext().getObject();
                this._updateLeaveStatus(
                    oLeave.ID,
                    "REJECTED"
                );
            },
            _updateLeaveStatus: async function (leaveId, status) {
                try {
                    const oModel = this.getView().getModel();

                    const oAction = oModel.bindContext("/ApproveLeave(...)");

                    oAction.setParameter("leaveId", leaveId);
                    oAction.setParameter("status", status);

                    await oAction.execute();

                    sap.m.MessageToast.show(
                        "Leave " + status.toLowerCase() + " successfully"
                    );

                    oModel.refresh();

                } catch (oError) {
                    sap.m.MessageBox.error(oError.message);
                }
            },
            onSearch: function () {
                this._applyFilters();
            },

            onStatusFilter: function () {
                this._applyFilters();
            },
            _applyFilters: function () {

                const sSearch = this.byId("leaveSearch") ?
                    this.byId("leaveSearch").getValue() : "";

                const sStatus = this.byId("lStatusFilter").getSelectedKey();

                const aFilters = [];

                // Search filter
                if (sSearch) {
                    aFilters.push(
                        new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter({
                                    path: "employee/NAME",
                                    operator: sap.ui.model.FilterOperator.Contains,
                                    value1: sSearch,
                                    caseSensitive: false
                                }),
                                new sap.ui.model.Filter({
                                    // "tolower(LEAVE_ID)", FilterOperator.Contains, sSearch.toLowerCase()
                                    path: "LEAVE_ID",
                                    operator: sap.ui.model.FilterOperator.Contains,
                                    value1: sSearch,
                                    caseSensitive: false
                                })
                            ],
                            and: false
                        })
                    );
                }

                // Status filter
                if (sStatus) {
                    aFilters.push(
                        new sap.ui.model.Filter(
                            "STATUS",
                            sap.ui.model.FilterOperator.EQ,
                            sStatus
                        )
                    );
                }

                this.byId("leaveTable")
                    .getBinding("items")
                    .filter(aFilters);
            }
        });
    });
