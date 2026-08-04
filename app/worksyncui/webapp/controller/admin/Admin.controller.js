sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Core"
], (Controller, JSONModel, Core) => {
    "use strict";

    const NAV_PAGES = {
        dashboard: "dashboardView",
        employees: "employeesView",
        designations: "designationsView",
        skills: "skillsView",
        projects: "projectsView",
        allocations: "allocationsView",
        leave: "leaveView",
        forecast: "forecastView",
        spof: "spofView"
    };

    return Controller.extend("com.amista.worksyncui.controller.admin.Admin", {
        onInit: function () {
            //Nav to Employee detail
            this.getOwnerComponent().getRouter()
                .getRoute("AdminEmployeeDetail")
                .attachPatternMatched(this._onEmployeeDetailMatched, this);

            sap.ui.getCore().getEventBus().subscribe(
                "Admin", "BackToEmployees", this._onBackToEmployees, this
            );
            //Nav to Project Detail
            this.getOwnerComponent().getRouter()
                .getRoute("ProjectDetail")
                .attachPatternMatched(this._onProjectDetailMatched, this);

            sap.ui.getCore().getEventBus().subscribe(
                "Admin", "BackToProjects", this._onBackToProjects, this
            );

            //Refresh Recommended Resources on Project Detail
            sap.ui.getCore().getEventBus().subscribe(
                "Project",
                "Rebind",
                this._rebindProject,
                this
            );
        },
        //Rebind Project Detail
        _rebindProject: function (sChannel, sEvent, oData) {

            this._onProjectDetailMatched({
                getParameter: function () {
                    return {
                        projectId: oData.projectId
                    };
                }
            });

        },
        //Check does Employee matched 
        _onEmployeeDetailMatched: function (oEvent) {
            const sEmployeeId = oEvent.getParameter("arguments").employeeId;
            const oDetailView = this.byId("adminEmployeeDetail");

            this.byId("adminNavContainer").to(oDetailView);
            //Binding Data
            oDetailView.bindElement({
                path: "/EMPLOYEES('" + sEmployeeId + "')",
                parameters: {
                    $expand: "designation,skills($expand=skill),allocations($expand=project)"
                }
            });
        },
        //Nav Back to Employees page
        _onBackToEmployees: function () {
            this.byId("adminNavContainer").to(this.byId("employeesView"));
            this.byId("sideNavigation").setSelectedKey("employees"); // keep nav highlight in sync
        },
        //Check Project Matched
        _onProjectDetailMatched: function (oEvent) {
            const sProjectId = oEvent.getParameter("arguments").projectId;
            const oDetailView = this.byId("adminProjectDetail");

            this.byId("adminNavContainer").to(oDetailView);

            oDetailView.bindElement({
                path: "/PROJECTS('" + sProjectId + "')",
                parameters: {
                    $expand: "manager,requirements($expand=requirementSkills($expand=skill)),allocations($expand=employee)"
                },
                events: {
                    dataReceived: (oDataEvent) => {
                        if (!oDataEvent.getParameter("data")) {
                            MessageToast.show("Project not found");
                            this.byId("adminNavContainer").to(this.byId("projectsView"));
                            return;
                        }
                        // call the detail view's controller method directly
                        const oDetailController = oDetailView.getController();
                        oDetailController._loadRecommendedResources(sProjectId);
                    }
                }
            });
        },
        //Nav Back to Projects
        _onBackToProjects: function () {
            this.byId("adminNavContainer").to(this.byId("projectsView"));
            this.byId("sideNavigation").setSelectedKey("projects");
        },
        //Side Navigation Button
        onToggleSideNavigation: function () {
            const oSideNav = this.byId("sideNavigation");
            oSideNav.setExpanded(
                !oSideNav.getExpanded()
            );
        },

        // SIDEBAR NAVIGATION
        onNavSelect: function (oEvent) {
            const oFCL = this.getOwnerComponent()
                .getRootControl()
                .byId("fcl");

            if (oFCL) { oFCL.setLayout(sap.f.LayoutType.OneColumn); }
            this.getOwnerComponent()
                .getRouter()
                .navTo("Admin", {}, true);

            const oItem = oEvent.getParameter("item");
            const sKey = oItem.getKey();   // e.g. "employees", "dashboard"

            const sViewId = NAV_PAGES[sKey];
            if (!sViewId) {
                return;
            }
            //Refresh Pages on Navigation
            this.byId("adminNavContainer").to(this.byId(sViewId));
            if (sKey === "employees") {
                sap.ui.getCore().getEventBus().publish("Employees", "Refresh");
            }
            if (sKey === "spof") {
                sap.ui.getCore().getEventBus().publish("Spof", "Refresh");
            }
            if (sKey === "forecast") {
                sap.ui.getCore().getEventBus().publish("Forecast", "Refresh");
            }
            if (sKey === "allocations") {
                sap.ui.getCore().getEventBus().publish("Allocations", "Refresh");
            }
            if (sKey === "dashboard") {
                sap.ui.getCore().getEventBus().publish("Dashboard", "Refresh");
            }
            if (sKey === "leave") {
                sap.ui.getCore().getEventBus().publish("Leaves", "Refresh");
            }

        },
        //Theme Button Controller
        onThemeToggle: function (oEvent) {
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
        }
    });

});

