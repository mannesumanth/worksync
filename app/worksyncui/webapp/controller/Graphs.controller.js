sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.Graphs", {

        onInit: function () {

            this.getView().setModel(new JSONModel({ value: [] }), "graphEmployees");

            this.getView().setModel(new JSONModel({ name: "", details: [] }), "graphPopover");

            sap.ui.getCore().getEventBus().subscribe(
                "Graphs",
                "DataRefresh",
                this._fetchGraphEmployeeData,
                this
            );

            this._fetchGraphEmployeeData();
        },

        onExit: function () {
            sap.ui.getCore().getEventBus().unsubscribe(
                "Graphs",
                "DataRefresh",
                this._fetchGraphEmployeeData,
                this
            );
        },

        // ---- fetch EmployeeMetrics from the OData V4 service and post-process ----
        _fetchGraphEmployeeData: async function () {
            try {
                const oDataModel = this.getOwnerComponent().getModel();
                const oListBinding = oDataModel.bindList("/GetEmployeeMetrics");
                const aContexts = await oListBinding.requestContexts(0, 1000);
                const aEmployees = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });

                aEmployees.forEach(function (oEmp) {
                    oEmp.EXPERIENCE_NUM = parseFloat(oEmp.EXPERIENCE) || 0;
                    oEmp.USED_LEAVES_TOTAL = (oEmp.CASUAL_USED || 0) + (oEmp.SICK_USED || 0) + (oEmp.EARNED_USED || 0);
                    oEmp.AVAILABLE_LEAVES_TOTAL = (oEmp.CASUAL_AVAILABLE || 0) + (oEmp.SICK_AVAILABLE || 0) + (oEmp.EARNED_AVAILABLE || 0);
                });

                this.getView().getModel("graphEmployees").setData({ value: aEmployees });
            } catch (oError) {
                console.error(oError);
                MessageToast.show("Failed to load employee metrics");
            }
        },

        // 1. BASE FILTER — Emp_ID + Allocation range -> baseChart

        onBaseFilterChange: function () {
            const aEmpIds = this.byId("baseEmpFilter").getSelectedKeys();
            const aRange = this.byId("baseAllocFilter").getRange();

            const aFilters = [
                new Filter("TOTAL_ALLOCATION", FilterOperator.BT, aRange[0], aRange[1])
            ];
            if (aEmpIds.length) {
                aFilters.push(new Filter({
                    filters: aEmpIds.map((sId) => new Filter("EMP_ID", FilterOperator.EQ, sId)),
                    and: false
                }));
            }
            this._applyChartFilter("baseChart", aFilters);
        },

        onResetBaseFilter: function () {
            this.byId("baseEmpFilter").setSelectedKeys([]);
            this.byId("baseAllocFilter").setRange([0, 100]);
            this._applyChartFilter("baseChart", []);
        },

        onBaseChartSelect: function (oEvent) {
            this._showEmployeeDetails(oEvent, [
                { label: "Name", field: "NAME" },
                { label: "Email", field: "EMAIL" },
                { label: "Allocation %", field: "TOTAL_ALLOCATION" }
            ]);
        },

        // 2. EXPERIENCE FILTER — Emp_ID + Experience range -> expChart

        onExpFilterChange: function () {
            const aEmpIds = this.byId("expEmpFilter").getSelectedKeys();
            const aRange = this.byId("expFilter").getRange();

            const aFilters = [
                new Filter("EXPERIENCE_NUM", FilterOperator.BT, aRange[0], aRange[1])
            ];
            if (aEmpIds.length) {
                aFilters.push(new Filter({
                    filters: aEmpIds.map((sId) => new Filter("EMP_ID", FilterOperator.EQ, sId)),
                    and: false
                }));
            }
            this._applyChartFilter("expChart", aFilters);
        },

        onResetExpFilter: function () {
            this.byId("expEmpFilter").setSelectedKeys([]);
            this.byId("expFilter").setRange([0, 20]);
            this._applyChartFilter("expChart", []);
        },

        onExpChartSelect: function (oEvent) {
            this._showEmployeeDetails(oEvent, [
                { label: "Name", field: "NAME" },
                { label: "Email", field: "EMAIL" },
                { label: "Experience (yrs)", field: "EXPERIENCE" }
            ]);
        },

        // 3. LEAVES FILTER — min used / min available -> leavesChart

        onLeavesFilterChange: function () {
            const iMinUsed = this.byId("usedLeavesFilter").getValue();
            const iMinAvail = this.byId("availLeavesFilter").getValue();

            const aFilters = [
                new Filter("USED_LEAVES_TOTAL", FilterOperator.GE, iMinUsed),
                new Filter("AVAILABLE_LEAVES_TOTAL", FilterOperator.GE, iMinAvail)
            ];
            this._applyChartFilter("leavesChart", aFilters);
        },

        onResetLeavesFilter: function () {
            this.byId("usedLeavesFilter").setValue(0);
            this.byId("availLeavesFilter").setValue(0);
            this._applyChartFilter("leavesChart", []);
        },

        onLeavesChartSelect: function (oEvent) {
            this._showEmployeeDetails(oEvent, [
                { label: "Name", field: "NAME" },
                { label: "Casual (used/avail)", field: null, custom: (o) => `${o.CASUAL_USED} / ${o.CASUAL_AVAILABLE}` },
                { label: "Sick (used/avail)", field: null, custom: (o) => `${o.SICK_USED} / ${o.SICK_AVAILABLE}` },
                { label: "Earned (used/avail)", field: null, custom: (o) => `${o.EARNED_USED} / ${o.EARNED_AVAILABLE}` }
            ]);
        },

        // 4. PROJECTS FILTER — Emp_ID + min project count -> projChart

        onProjFilterChange: function () {
            const aEmpIds = this.byId("projEmpFilter").getSelectedKeys();
            const iMinProjects = this.byId("projCountFilter").getValue();

            const aFilters = [
                new Filter("PROJECT_COUNT", FilterOperator.GE, iMinProjects)
            ];
            if (aEmpIds.length) {
                aFilters.push(new Filter({
                    filters: aEmpIds.map((sId) => new Filter("EMP_ID", FilterOperator.EQ, sId)),
                    and: false
                }));
            }
            this._applyChartFilter("projChart", aFilters);
        },

        onResetProjFilter: function () {
            this.byId("projEmpFilter").setSelectedKeys([]);
            this.byId("projCountFilter").setValue(0);
            this._applyChartFilter("projChart", []);
        },

        onProjChartSelect: function (oEvent) {
            this._showEmployeeDetails(oEvent, [
                { label: "Name", field: "NAME" },
                { label: "Email", field: "EMAIL" },
                { label: "Project Count", field: "PROJECT_COUNT" }
            ]);
        },
        
        // shared helpers (renamed so they can't be mistaken for anything in Dashboard.js)
        
        _applyChartFilter: function (sChartId, aFilters) {
            const oBinding = this.byId(sChartId).getDataset().getBinding("data");
            oBinding.filter(aFilters.length ? new Filter({ filters: aFilters, and: true }) : []);
        },

        // Reads the clicked data point, finds the full employee record, and opens the popover
        _showEmployeeDetails: function (oEvent, aFieldConfig) {
            const aData = oEvent.getParameter("data");
            if (!aData || !aData.length) {
                return;
            }
            const sEmpId = aData[0].data.Employee; // matches the dimension name used in each chart
            const aAll = this.getView().getModel("graphEmployees").getData().value;
            const oEmp = aAll.find((o) => o.EMP_ID === sEmpId);
            if (!oEmp) {
                return;
            }

            const aDetails = aFieldConfig.map((oCfg) => ({
                label: oCfg.label,
                value: oCfg.custom ? oCfg.custom(oEmp) : oEmp[oCfg.field]
            }));

            this.getView().getModel("graphPopover").setData({ name: oEmp.NAME, details: aDetails });
            this.byId("detailsPopover").openBy(oEvent.getSource());
        }
    });
});
