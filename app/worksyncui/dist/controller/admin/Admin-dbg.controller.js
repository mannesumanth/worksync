sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
], (Controller, MessageToast, MessageBox, JSONModel) => {
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
            this.getView().setModel(new JSONModel({ skills: [] }), "projectModel");
            this.getView().setModel(new JSONModel({ currentMonthAvailable: 0, nextMonthAvailable: 0, currentMonthLeaves: 0, nextMonthLeaves: 0, pendingLeaves: 0 }), "forecast");
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
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("ProjectDetail")
                .attachPatternMatched(this._onObjectMatched, this);
            this.getView().setModel(
                new JSONModel({
                    recommendations: []
                }),
                "recommendations"
            );
            this._bExpanded = true;
        },
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

            if (oFCL) {
                oFCL.setLayout(sap.f.LayoutType.OneColumn);
            }

            this.getOwnerComponent()
                .getRouter()
                .navTo("Admin", {}, true);


            const oItem = oEvent.getParameter("item");
            const sKey = oItem.getKey();   // e.g. "employees", "dashboard"

            const sPageId = NAV_PAGES[sKey];
            if (!sPageId) return;

            const sViewId = NAV_PAGES[sKey];

            if (!sViewId) {
                return;
            }

            this
            .byId("adminNavContainer")
                .to(this.byId(sViewId));

            if (sKey === "spof") {
                this._loadSpofRisks();
            }
        },

        onTilePress: function (oEvent) {
            const sKey = oEvent.getSource().data("nav");
            const sViewId = NAV_PAGES[sKey];
            if (!sViewId) {
                MessageToast.show("Page not found");
                return;
            }
            this.byId("adminNavContainer")
                .to(this.byId(sViewId));
        }


    });

});

