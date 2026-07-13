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
    return Controller.extend("com.amista.worksyncui.controller.admin.Forecast", {
        onInit: function () {
            this._searchValue = "";
            this._statusValue = "";
            this._allocationValue = "";
            this.getView().setModel(
                new JSONModel({
                    value: []
                }),
                "forecast"
            );
            this.getView().setModel(
                new JSONModel({
                    available: 0,
                    bench: 0,
                    leave: 0,
                    utilization: 0,
                    employeeCount: 0
                }),
                "summary"
            );
            this._loadForecast();
        },

        _loadForecast: async function () {
            try {
                const oModel = this.getView().getModel();
                const oAction = oModel.bindContext("/GetResourceForecast(...)");
                await oAction.invoke();
                const aData = oAction.getBoundContext().getObject().value || [];
                this.getView()
                    .getModel("forecast")
                    .setData({
                        value: aData
                    });
                this._calculateSummary(aData);

            } catch (e) {
                console.error(e);
                MessageToast.show("Unable to load forecast.");
            }
        },

        _calculateSummary: function (aData) {
            const available = aData.filter(x => x.CURRENT_STATUS === "Available").length;
            const bench = aData.filter(x => x.CURRENT_STATUS === "Bench").length;
            const leave = aData.filter(x => x.CURRENT_STATUS === "On Leave").length;
            const utilization =
                aData.length
                    ? Math.round(
                        aData.reduce(
                            (sum, x) => sum + Number(x.CURRENT_ALLOCATION),
                            0
                        ) / aData.length
                    )
                    : 0;
            this.getView()
                .getModel("summary")
                .setData({
                    available,
                    bench,
                    leave,
                    utilization,
                    employeeCount: aData.length
                });
        },

        _applyFilters: function () {
            const aFilters = [];
            if (this._searchValue) {
                aFilters.push(
                    new Filter({
                        filters: [
                            new Filter(
                                "NAME",
                                FilterOperator.Contains,
                                this._searchValue
                            ),
                            new Filter(
                                "EMP_ID",
                                FilterOperator.Contains,
                                this._searchValue
                            ),
                            new Filter(
                                "DESIGNATION",
                                FilterOperator.Contains,
                                this._searchValue
                            )
                        ],
                        and: false
                    })
                );
            }
            if (this._statusValue) {
                aFilters.push(
                    new Filter(
                        "CURRENT_STATUS",
                        FilterOperator.EQ,
                        this._statusValue
                    )
                );
            }
            if (this._allocationValue) {
                switch (this._allocationValue) {
                    case "0":
                        aFilters.push(
                            new Filter(
                                "CURRENT_ALLOCATION",
                                FilterOperator.EQ,
                                0
                            )
                        );
                        break;
                    case "50":
                        aFilters.push(
                            new Filter(
                                "CURRENT_ALLOCATION",
                                FilterOperator.LT,
                                50
                            )
                        );
                        break;
                    case "100":
                        aFilters.push(
                            new Filter(
                                "CURRENT_ALLOCATION",
                                FilterOperator.EQ,
                                100
                            )
                        );
                        break;
                }
            }
            this.byId("forecastTable")
                .getBinding("items")
                .filter(aFilters);
        },

        onForecastSearch: function (oEvent) {
            this._searchValue = oEvent.getParameter("newValue");
            this._applyFilters();
        },

        onStatusFilter: function (oEvent) {
            this._statusValue = oEvent.getSource().getSelectedKey();
            this._applyFilters();
        },

        onAllocationFilter: function (oEvent) {
            this._allocationValue = oEvent.getSource().getSelectedKey();
            this._applyFilters();
        },

        onRefreshForecast: async function () {
            await this._loadForecast();
            this._searchValue = "";
            this._statusValue = "";
            this._allocationValue = "";
            this.byId("forecastSearch").setValue("");
            this.byId("statusFilter").setSelectedKey("");
            this.byId("allocationFilter").setSelectedKey("");
            this._applyFilters();
            MessageToast.show("Forecast refreshed.");
        },

        onForecastPress: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext("forecast");
            if (!oContext) {
                return;
            }
            const oData = oContext.getObject();
            MessageToast.show(
                "Employee : " + oData.NAME
            );
        }
    });
});