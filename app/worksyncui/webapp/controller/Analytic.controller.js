sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem"
], function (Controller,
    JSONModel,
    FlattenedDataset,
    FeedItem) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.Analytic", {

        onInit: function () {
            // const oModel = new sap.ui.model.json.JSONModel({
            //     chartData: []
            // });
            const aData = [
                {
                    EMPLOYEE: "EMP0001",
                    ALLOCATION: 80
                },
                {
                    EMPLOYEE: "EMP0002",
                    ALLOCATION: 60
                },
                {
                    EMPLOYEE: "EMP0003",
                    ALLOCATION: 95
                },
                {
                    EMPLOYEE: "EMP0004",
                    ALLOCATION: 45
                }
            ];

            const oModel = new JSONModel({
                chartData: aData
            });
            this.getView().setModel(oModel, "analytics");
            console.log("Analytic controller loaded");
            this._loadEmployeeChart();
        },
        _loadEmployeeChart: function () {
            const oViz = this.byId("analyticsChart");
            const oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Employee",
                    value: "{analytics>EMPLOYEE}"
                }],
                measures: [{
                    name: "Allocation %",
                    value: "{analytics>ALLOCATION}"
                }],
                data: {
                    path: "analytics>/chartData"
                }
            });
            oViz.setDataset(oDataset);
            oViz.setModel(this.getView().getModel("analytics"));
            oViz.setVizType("column");
            oViz.removeAllFeeds();
            oViz.addFeed(new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: ["Allocation %"]
            }));

            oViz.addFeed(new FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["Employee"]
            }));

        },
        onGraphChange: function (oEvent) {

            const sKey = oEvent.getSource().getSelectedKey();

            switch (sKey) {

                case "employees":
                    this._loadEmployeeChart();
                    break;

                case "projects":
                    this._loadProjectChart();
                    break;

                case "leaves":
                    this._loadLeaveChart();
                    break;

                case "skills":
                    this._loadSkillChart();
                    break;

                case "utilization":
                    this._loadUtilizationChart();
                    break;

            }

        },
        _loadProjectChart: function () {

            const aData = [

                {
                    PROJECT: "Apollo",
                    EMPLOYEES: 6
                },
                {
                    PROJECT: "HRMS",
                    EMPLOYEES: 3
                },
                {
                    PROJECT: "CRM",
                    EMPLOYEES: 8
                }

            ];

            this._renderChart({
                data: aData,
                dimension: "PROJECT",
                dimensionLabel: "Project",
                measure: "EMPLOYEES",
                measureLabel: "Employees",
                vizType: "bar"
            });

        }, _loadLeaveChart: function () {

            const aData = [

                {
                    TYPE: "Casual",
                    COUNT: 18
                },
                {
                    TYPE: "Sick",
                    COUNT: 7
                },
                {
                    TYPE: "LOP",
                    COUNT: 3
                }

            ];

            this._renderChart({

                data: aData,

                dimension: "TYPE",

                dimensionLabel: "Leave Type",

                measure: "COUNT",

                measureLabel: "Leaves",

                vizType: "pie"

            });

        }, _loadSkillChart: function () {

            const aData = [

                {
                    SKILL: "Java",
                    EMPLOYEES: 15
                },
                {
                    SKILL: "SAP UI5",
                    EMPLOYEES: 11
                },
                {
                    SKILL: "CAP",
                    EMPLOYEES: 9
                }

            ];

            this._renderChart({

                data: aData,

                dimension: "SKILL",

                dimensionLabel: "Skill",

                measure: "EMPLOYEES",

                measureLabel: "Employees",

                vizType: "column"

            });

        }, _loadUtilizationChart: function () {

            const aData = [

                {
                    MONTH: "Jan",
                    VALUE: 72
                },
                {
                    MONTH: "Feb",
                    VALUE: 79
                },
                {
                    MONTH: "Mar",
                    VALUE: 84
                }

            ];

            this._renderChart({

                data: aData,

                dimension: "MONTH",

                dimensionLabel: "Month",

                measure: "VALUE",

                measureLabel: "Utilization",

                vizType: "line"

            });

        },
        _renderChart: function (oConfig) {

            const oViz = this.byId("analyticsChart");

            const oModel = new JSONModel({
                chartData: oConfig.data
            });

            this.getView().setModel(oModel, "analytics");

            const oDataset = new FlattenedDataset({

                dimensions: [{
                    name: oConfig.dimensionLabel,
                    value: "{analytics>" + oConfig.dimension + "}"
                }],

                measures: [{
                    name: oConfig.measureLabel,
                    value: "{analytics>" + oConfig.measure + "}"
                }],

                data: {
                    path: "analytics>/chartData"
                }

            });

            oViz.setDataset(oDataset);

            oViz.setModel(oModel);

            oViz.setVizType(oConfig.vizType);

            oViz.removeAllFeeds();

            oViz.addFeed(new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: [oConfig.measureLabel]
            }));

            oViz.addFeed(new FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: [oConfig.dimensionLabel]
            }));

        }, _loadEmployeeChart: function () {

            this._renderChart({

                data: [

                    { EMPLOYEE: "EMP001", ALLOCATION: 80 },
                    { EMPLOYEE: "EMP002", ALLOCATION: 60 },
                    { EMPLOYEE: "EMP003", ALLOCATION: 90 },
                    { EMPLOYEE: "EMP004", ALLOCATION: 50 }

                ],

                dimension: "EMPLOYEE",

                dimensionLabel: "Employee",

                measure: "ALLOCATION",

                measureLabel: "Allocation %",

                vizType: "column"

            });

        }

    });

});