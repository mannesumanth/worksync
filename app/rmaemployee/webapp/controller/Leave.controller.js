sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/unified/DateTypeRange",
    "sap/ui/core/date/UI5Date",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], function (
    Controller,
    JSONModel,
    MessageBox,
    MessageToast,
    DateTypeRange,
    UI5Date,
    Filter,
    FilterOperator
) {
    "use strict";
    return Controller.extend(
        "com.amista.rmaemployee.controller.Leave",
        {
            onInit: function () {
                // Leave balance
                this.getView().setModel(
                    new JSONModel([]),
                    "leaveBalance"
                );
                // Leave history
                this.getView().setModel(
                    new JSONModel([]),
                    "leaves"
                );
            },
            // Called by Home.controller.js
            // after the OData V4 model is assigned
            loadData: function () {
                this._loadLeaveBalance();
                this._loadLeaves();
            },
            //Leave Status filter
            onLeaveStatusFilter: function (oEvent) {

                const sStatus =
                    oEvent.getParameter("item").getKey();

                const oTable =
                    this.byId("leaveHistoryTable");

                const oBinding =
                    oTable.getBinding("items");

                if (!oBinding) {
                    return;
                }

                const oActionColumn =
                    this.byId("leaveActionColumn");


                // All
                if (sStatus === "ALL") {

                    oBinding.filter([]);

                    oActionColumn.setVisible(true);

                    return;
                }


                // Pending / Approved
                if (
                    sStatus === "PENDING" ||
                    sStatus === "APPROVED"
                ) {

                    oActionColumn.setVisible(true);

                } else {

                    // Rejected / Cancelled / Withdrawal Request
                    oActionColumn.setVisible(false);

                }


                // Apply status filter

                const oFilter =
                    new sap.ui.model.Filter(
                        "STATUS",
                        sap.ui.model.FilterOperator.EQ,
                        sStatus
                    );

                oBinding.filter([oFilter]);
            },
            // Leave Balance
            _loadLeaveBalance: async function () {
                try {
                    const oModel =
                        this.getView().getModel();
                    if (!oModel) {
                        throw new Error(
                            "OData V4 model is not available."
                        );
                    }
                    const oBinding = oModel.bindList("/MyLeaveBalance");
                    const aContexts =
                        await oBinding.requestContexts(0, 1);
                    const aBalance =
                        aContexts.map(function (oContext) {
                            return oContext.getObject();
                        });
                    this.getView()
                        .getModel("leaveBalance")
                        .setData(aBalance);
                } catch (oError) {
                    console.error("Error loading leave balance:", oError);
                    MessageBox.error("Unable to load leave balance.");
                }
            },
            // Leave History
            _loadLeaves: async function () {
                try {
                    const oModel =
                        this.getView().getModel();
                    if (!oModel) {
                        throw new Error(
                            "OData V4 model is not available."
                        );
                    }
                    const oBinding =
                        oModel.bindList("/MyLeaves");
                    const aContexts =
                        await oBinding.requestContexts(
                            0,
                            100
                        );
                    const aLeaves =
                        aContexts.map(function (oContext) {
                            return oContext.getObject();
                        });
                    this.getView()
                        .getModel("leaves")
                        .setData(aLeaves);
                    this._loadLeaveCalendar(aLeaves);
                } catch (oError) {
                    console.error(
                        "Error loading employee leaves:",
                        oError
                    );
                    MessageBox.error(
                        "Unable to load leave history."
                    );
                }
            },

            // Leave Calendar
            _loadLeaveCalendar: function (aLeaves) {
                const oCalendar = this.byId("leaveCalendar");
                if (!oCalendar) {
                    return;
                }
                oCalendar.destroySpecialDates();
                aLeaves.forEach(function (oLeave) {
                    if (
                        !oLeave.LEAVE_FROM ||
                        !oLeave.LEAVE_TO
                    ) {
                        return;
                    }
                    const oStartDate =
                        this._createDate(
                            oLeave.LEAVE_FROM
                        );
                    const oEndDate =
                        this._createDate(
                            oLeave.LEAVE_TO
                        );
                    const sType =
                        this._getLeaveDateType(
                            oLeave.STATUS
                        );
                    oCalendar.addSpecialDate(
                        new DateTypeRange({
                            startDate: oStartDate,
                            endDate: oEndDate,
                            type: sType,
                            tooltip:
                                oLeave.LEAVE_TYPE +
                                " - " +
                                oLeave.STATUS
                        })
                    );
                }, this);
            },
            _getLeaveDateType: function (sStatus) {
                switch (sStatus) {
                    case "APPROVED":
                        return "Type08";
                    case "PENDING":
                        return "Type01";
                    case "REJECTED":
                        return "Type06";
                    case "CANCELLED":
                        return "Type04";
                    case "WITHDRAW_REQUEST":
                        return "Type02";
                    case "WITHDRAWN":
                        return "Type04";
                    default:
                        return "Type01";
                }
            },
            _createDate: function (sDate) {
                const aDate = sDate.split("-");
                return UI5Date.getInstance(
                    Number(aDate[0]),
                    Number(aDate[1]) - 1,
                    Number(aDate[2])
                );
            },
            // Calculate Leave Days
            onLeaveDateChange: function () {
                const oFromDate = this.byId("leaveFromDate").getDateValue();
                const oToDate = this.byId("leaveToDate").getDateValue();
                const oDaysInput = this.byId("leaveDays");
                if (!oFromDate || !oToDate) {
                    oDaysInput.setValue("");
                    return;
                }

                if (oFromDate > oToDate) {
                    oDaysInput.setValue("");
                    MessageToast.show(
                        "Leave From date cannot be greater than Leave To date."
                    );
                    return;
                }
                const iDays =
                    this._getWorkingDays(
                        oFromDate,
                        oToDate
                    );
                oDaysInput.setValue(
                    String(iDays)
                );
            },
            _getWorkingDays: function (
                oFromDate,
                oToDate
            ) {
                let iDays = 0;
                const oCurrentDate = new Date(oFromDate);
                const oEndDate = new Date(oToDate);
                while (
                    oCurrentDate <= oEndDate
                ) {
                    const iDay = oCurrentDate.getDay();
                    if (
                        iDay !== 0 &&
                        iDay !== 6
                    ) {
                        iDays++;
                    }
                    oCurrentDate.setDate(
                        oCurrentDate.getDate() + 1
                    );
                }
                return iDays;
            },
            // Apply Leave
            onApplyLeave: async function () {
                const sLeaveType =
                    this.byId("leaveTypeSelect")
                        .getSelectedKey();
                const oFromDate =
                    this.byId("leaveFromDate")
                        .getDateValue();
                const oToDate =
                    this.byId("leaveToDate")
                        .getDateValue();
                const sReason =
                    this.byId("leaveReason")
                        .getValue()
                        .trim();
                if (!sLeaveType) {
                    MessageBox.warning(
                        "Please select a leave type."
                    );
                    return;
                }
                if (!oFromDate) {
                    MessageBox.warning(
                        "Please select the leave start date."
                    );
                    return;
                }
                if (!oToDate) {
                    MessageBox.warning(
                        "Please select the leave end date."
                    );
                    return;
                }
                if (oFromDate > oToDate) {
                    MessageBox.error(
                        "Leave From date cannot be greater than Leave To date."
                    );
                    return;
                }
                const iDays =
                    this._getWorkingDays(
                        oFromDate,
                        oToDate
                    );
                if (iDays <= 0) {
                    MessageBox.warning(
                        "The selected date range does not contain any working days."
                    );
                    return;
                }
                const sLeaveFrom =
                    this._formatDate(
                        oFromDate
                    );
                const sLeaveTo =
                    this._formatDate(
                        oToDate
                    );
                try {
                    const oModel =
                        this.getView().getModel();
                    if (!oModel) {
                        throw new Error(
                            "OData V4 model is not available."
                        );
                    }
                    const oAction =
                        oModel.bindContext(
                            "/ApplyLeave(...)"
                        );
                    oAction.setParameter(
                        "leaveType",
                        sLeaveType
                    );
                    oAction.setParameter(
                        "leaveFrom",
                        sLeaveFrom
                    );
                    oAction.setParameter(
                        "leaveTo",
                        sLeaveTo
                    );
                    oAction.setParameter(
                        "reason",
                        sReason
                    );
                    await oAction.execute();
                    MessageToast.show(
                        "Leave request submitted successfully."
                    );
                    this._clearLeaveForm();
                    await this._loadLeaveBalance();
                    await this._loadLeaves();
                } catch (oError) {
                    console.error(
                        "Error applying leave:",
                        oError
                    );
                    MessageBox.error(
                        this._getErrorMessage(
                            oError,
                            "Unable to apply leave."
                        )
                    );
                }
            },
            // Cancel Leave
            onCancelLeave: function (oEvent) {
                const oContext =
                    oEvent.getSource()
                        .getBindingContext("leaves");
                if (!oContext) {
                    return;
                }
                const oLeave = oContext.getObject();
                MessageBox.confirm(
                    "Are you sure you want to cancel this leave request?",
                    {
                        title: "Cancel Leave",
                        onClose: async function (sAction) {
                            if (
                                sAction !==
                                MessageBox.Action.OK
                            ) {
                                return;
                            }
                            await this._cancelLeave(
                                oLeave.ID
                            );
                        }.bind(this)
                    }
                );
            },
            _cancelLeave: async function (sLeaveId) {
                try {
                    const oModel =
                        this.getView().getModel();

                    const oAction =
                        oModel.bindContext(
                            "/CancelLeave(...)"
                        );
                    oAction.setParameter(
                        "leaveId",
                        sLeaveId
                    );
                    await oAction.execute();
                    MessageToast.show(
                        "Leave cancelled successfully."
                    );
                    await this._loadLeaveBalance();
                    await this._loadLeaves();
                } catch (oError) {
                    console.error(
                        "Error cancelling leave:",
                        oError
                    );
                    MessageBox.error(
                        this._getErrorMessage(
                            oError,
                            "Unable to cancel leave."
                        )
                    );
                }
            },
            // Withdraw Leave
            onWithdrawLeave: function (oEvent) {
                const oContext = oEvent.getSource().getBindingContext("leaves");
                if (!oContext) {
                    return;
                }
                const oLeave = oContext.getObject();
                MessageBox.confirm(
                    "You are withdrawing your approved leave. Continue?",
                    {
                        title: "Withdraw Leave",
                        onClose: async function (sAction) {
                            if (
                                sAction !== MessageBox.Action.OK
                            ) {
                                return;
                            }
                            await this._withdrawLeave(oLeave.ID);
                        }.bind(this)
                    }
                );
            },
            _withdrawLeave: async function (sLeaveId) {
                try {
                    const oModel =
                        this.getView().getModel();
                    const oAction =
                        oModel.bindContext(
                            "/WithdrawLeave(...)"
                        );
                    oAction.setParameter(
                        "leaveId",
                        sLeaveId
                    );
                    await oAction.execute();
                    MessageToast.show(
                        "Withdrawal request submitted successfully."
                    );
                    await this._loadLeaveBalance();
                    await this._loadLeaves();
                } catch (oError) {
                    console.error(
                        "Error withdrawing leave:",
                        oError
                    );
                    MessageBox.error(
                        this._getErrorMessage(
                            oError,
                            "Unable to submit withdrawal request."
                        )
                    );
                }
            },
            // Clear Apply Leave Form
            _clearLeaveForm: function () {
                this.byId("leaveTypeSelect")
                    .setSelectedKey("");
                this.byId("leaveFromDate")
                    .setDateValue(null);
                this.byId("leaveToDate")
                    .setDateValue(null);
                this.byId("leaveDays")
                    .setValue("");
                this.byId("leaveReason")
                    .setValue("");
            },
            // Date Formatting
            _formatDate: function (oDate) {
                const iYear =
                    oDate.getFullYear();
                const iMonth =
                    String(
                        oDate.getMonth() + 1
                    ).padStart(2, "0");
                const iDay =
                    String(
                        oDate.getDate()
                    ).padStart(2, "0");
                return (
                    iYear +
                    "-" +
                    iMonth +
                    "-" +
                    iDay
                );
            },
            // Error Message
            _getErrorMessage: function (
                oError,
                sDefaultMessage
            ) {
                if (
                    oError &&
                    oError.message
                ) {
                    return oError.message;
                }
                return sDefaultMessage;
            }
        }
    );
});