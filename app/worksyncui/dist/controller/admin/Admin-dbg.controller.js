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

            this.byId("adminNavContainer")
                .to(this.byId(sViewId));
        },

        // _onObjectMatched: function (oEvent) {
        //     const sProjectId = oEvent.getParameter("arguments").projectId;
        //     this.getView().bindElement({
        //         path: "/PROJECTS('" + sProjectId + "')",
        //         parameters: {
        //             $expand:
        //                 "manager," +
        //                 "requirements($expand=requirementSkills($expand=skill))," +
        //                 "allocations($expand=employee)," +
        //                 "risks($expand=employee,skill)"
        //         },
        //         events: {
        //             dataReceived: async () => {
        //                 const oProject =
        //                     this.getView()
        //                         .getBindingContext()
        //                         .getObject();
        //                 await this._loadRecommendations(oProject);
        //             }
        //         }
        //     });
        // },

        // Clicking a dashboard tile navigates to that section
        onTilePress: function (oEvent) {
            const sKey = oEvent.getSource().data("nav");
            const sViewId = NAV_PAGES[sKey];
            if (!sViewId) {
                MessageToast.show("Page not found");
                return;
            }
            this.byId("adminNavContainer")
                .to(this.byId(sViewId));
        },

        // DASHBOARD COUNTS


        // LEAVE REQUESTS — status breakdown for the dashboard donut chart



        // // EDIT / DELETE helpers
        // _editSelected: function (sTableId, sField) {
        //     const oTable = this.byId(sTableId);
        //     const oItem = oTable?.getSelectedItem();
        //     if (!oItem) { MessageToast.show("Please select a row to edit"); return; }
        //     const oCtx = oItem.getBindingContext();
        //     MessageBox.prompt("Edit value:", {
        //         initialValue: oCtx.getProperty(sField),
        //         onClose: async (sAction, sValue) => {
        //             if (sAction === MessageBox.Action.OK && sValue) {
        //                 try {
        //                     await oCtx.setProperty(sField, sValue);
        //                     await this.getView().getModel().submitBatch("$auto");
        //                     MessageToast.show("Updated successfully");
        //                 } catch (e) { MessageBox.error(e.message || "Update failed"); }
        //             }
        //         }
        //     });
        // },

        // _deleteSelected: function (sTableId) {
        //     const oTable = this.byId(sTableId);
        //     const oItem = oTable?.getSelectedItem();
        //     if (!oItem) { MessageToast.show("Please select a row to delete"); return; }
        //     MessageBox.confirm("Are you sure you want to delete this record?", {
        //         onClose: async (sAction) => {
        //             if (sAction === MessageBox.Action.OK) {
        //                 try {
        //                     await oItem.getBindingContext().delete("$auto");
        //                     MessageToast.show("Deleted successfully");
        //                 } catch (e) { MessageBox.error(e.message || "Delete failed"); }
        //             }
        //         }
        //     });
        // },


        // _loadRecommendations: async function (oProject) {
        //     const oModel = this.getView().getModel();
        //     let aRecommendations = [];
        //     const aRequirements = oProject.requirements || [];
        //     for (const oRequirement of aRequirements) {
        //         const aSkills = oRequirement.requirementSkills || [];
        //         for (const oSkill of aSkills) {
        //             try {
        //                 const oAction =
        //                     oModel.bindContext(
        //                         "/RecommendResources(...)"
        //                     );
        //                 console.log("Requirement Skill:", oSkill);
        //                 oAction.setParameter(
        //                     "skill_ID",
        //                     oSkill.skill?.ID || oSkill.skill_ID
        //                 );
        //                 oAction.setParameter(
        //                     "requiredLevel",
        //                     oSkill.REQUIRED_LEVEL
        //                 );
        //                 console.log(
        //                     "Calling RecommendResources",
        //                     oSkill.skill?.SKILL_NAME,
        //                     oSkill.skill?.ID || oSkill.skill_ID,
        //                     oSkill.REQUIRED_LEVEL
        //                 );
        //                 await oAction.execute();
        //                 const aResult =
        //                     oAction
        //                         .getBoundContext()
        //                         .getObject()
        //                         .value || [];

        //                 aRecommendations.push(...aResult);
        //             } catch (oError) {
        //                 console.error(oError);
        //             }
        //         }
        //     }
        //     const aFinal =
        //         Object.values(oUnique)
        //             .sort(
        //                 (a, b) =>
        //                     b.AVAILABLE_PERCENT -
        //                     a.AVAILABLE_PERCENT
        //             );

        //     this.getView()
        //         .getModel("recommendations")
        //         .setProperty(
        //             "/recommendations",
        //             aFinal
        //         );
        // },


    });

});

