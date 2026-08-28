sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (
    Controller,
    Filter,
    FilterOperator,
    JSONModel,
    MessageToast,
    MessageBox
) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.LeaveCalender", {

        onInit: function () {
            this.getView().setModel(
                new JSONModel({ bulkActionsEnabled: false, selectionMode: "None", selectedCount: 0 }),
                "ui"
            );

            this._sCurrentStatus = "PENDING";

            sap.ui.getCore().getEventBus().subscribe(
                "Leaves", "Refresh",
                this._onLeaveRefresh,
                this
            );
        },

        onExit: function () {
            sap.ui.getCore().getEventBus().unsubscribe(
                "Leaves", "Refresh",
                this._onLeaveRefresh,
                this
            );
        },

        _onLeaveRefresh: function () {
            this.getView().getModel().refresh();
        },

        _isActionable: function (sStatus) {
            return sStatus === "PENDING" || sStatus === "WITHDRAW_REQUEST";
        },

        _getApproveTargetStatus: function (sCurrentStatus) {
            return sCurrentStatus === "WITHDRAW_REQUEST" ? "WITHDRAWN" : "APPROVED";
        },

        _getRejectTargetStatus: function (sCurrentStatus) {
            return sCurrentStatus === "WITHDRAW_REQUEST" ? "APPROVED" : "REJECTED";
        },

        _updateLeaveStatus: async function (sLeaveId, sStatus, oOptions) {
            const bSilent = oOptions && oOptions.silent;
            try {
                const oModel = this.getView().getModel();
                const oAction = oModel.bindContext("/ApproveLeave(...)");
                oAction.setParameter("leaveId", sLeaveId);
                oAction.setParameter("status", sStatus);
                await oAction.execute();
                return true;
            } catch (oError) {
                if (!bSilent) {
                    MessageBox.error(oError.message);
                }
                return false;
            }
        },

        onSelectionChange: function () {
            const oTable = this.byId("leaveTable");
            const aContexts = oTable.getSelectedContexts();
            const aEligible = aContexts.filter(
                (oContext) => this._isActionable(oContext.getObject().STATUS)
            );

            this.getView().getModel("ui").setProperty("/bulkActionsEnabled", aEligible.length > 0);
            this.getView().getModel("ui").setProperty("/selectedCount", aEligible.length);
        },

        onBulkApprove: function () {
            this._confirmAndRunBulk("approve");
        },

        onBulkReject: function () {
            this._confirmAndRunBulk("reject");
        },

        _confirmAndRunBulk: function (sAction) {
            const oTable = this.byId("leaveTable");
            const aEligible = oTable.getSelectedContexts()
                .filter((oContext) => this._isActionable(oContext.getObject().STATUS));

            if (!aEligible.length) {
                MessageToast.show("No eligible requests selected.");
                return;
            }

            const sVerb = sAction === "approve" ? "approve" : "reject";

            MessageBox.confirm(
                `${sVerb.charAt(0).toUpperCase() + sVerb.slice(1)} ${aEligible.length} selected leave request(s)?`,
                {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: async (sConfirm) => {
                        if (sConfirm !== MessageBox.Action.YES) {
                            return;
                        }
                        await this._runBulk(aEligible, sAction);
                    }
                }
            );
        },

        _runBulk: async function (aContexts, sAction) {
            const oTable = this.byId("leaveTable");

            const aResults = await Promise.all(
                aContexts.map((oContext) => {
                    const oLeave = oContext.getObject();
                    const sTarget = sAction === "approve"
                        ? this._getApproveTargetStatus(oLeave.STATUS)
                        : this._getRejectTargetStatus(oLeave.STATUS);
                    return this._updateLeaveStatus(oLeave.ID, sTarget, { silent: true });
                })
            );

            const iSucceeded = aResults.filter(Boolean).length;
            const iFailed = aResults.length - iSucceeded;

            if (iSucceeded) {
                MessageToast.show(
                    `${iSucceeded} request(s) ${sAction === "approve" ? "approved" : "rejected"}.` +
                    (iFailed ? ` ${iFailed} failed.` : "")
                );
            } else {
                MessageBox.error("Failed to update the selected leave requests.");
            }

            oTable.removeSelections(true);
            this.getView().getModel("ui").setProperty("/bulkActionsEnabled", false);
            this.getView().getModel("ui").setProperty("/selectedCount", 0);
            this.getView().getModel().refresh();
        },

        onFilterChange: function (oEvent) {
            this._sCurrentStatus = oEvent.getSource().getSelectedKey();

            this.getView().getModel("ui").setProperty(
                "/selectionMode",
                this._sCurrentStatus === "ALL" ? "None" : "MultiSelect"
            );

            this._applyFilters();
        },

        onSearch: function () {
            this._applyFilters();
        },
        _calculateDays: function (sFrom, sTo) {

            if (!sFrom || !sTo) {
                return "";
            }

            const dFrom = new Date(sFrom);
            const dTo = new Date(sTo);

            let iDays = 0;

            const dCurrent = new Date(dFrom);

            while (dCurrent <= dTo) {

                const iDay = dCurrent.getDay();

                // 0 = Sunday, 6 = Saturday
                if (iDay !== 0 && iDay !== 6) {
                    iDays++;
                }

                dCurrent.setDate(
                    dCurrent.getDate() + 1
                );
            }

            return iDays;
        },

        _applyFilters: function () {
            const sSearch = this.byId("leaveSearch")
                ? this.byId("leaveSearch").getValue()
                : "";

            const aFilters = [];

            if (sSearch) {
                aFilters.push(
                    new Filter({
                        filters: [
                            new Filter({
                                path: "employee/NAME",
                                operator: FilterOperator.Contains,
                                value1: sSearch,
                                caseSensitive: false
                            }),
                            new Filter({
                                path: "LEAVE_ID",
                                operator: FilterOperator.Contains,
                                value1: sSearch,
                                caseSensitive: false
                            })
                        ],
                        and: false
                    })
                );
            }

            if (this._sCurrentStatus && this._sCurrentStatus !== "ALL") {
                aFilters.push(
                    new Filter("STATUS", FilterOperator.EQ, this._sCurrentStatus)
                );
            }

            this.byId("leaveTable")
                .getBinding("items")
                .filter(aFilters);
        }
    });
});