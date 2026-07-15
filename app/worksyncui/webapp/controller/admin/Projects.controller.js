sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (
    Controller,
    Fragment,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator,
) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.admin.Projects", {

        onCreateProject: async function () {
            this.getView().getModel("projectModel").setData({
                skills: []
            });

            if (!this._oProjectDialog) {
                this._oProjectDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.AddProject",
                    controller: this
                });

                this.getView().addDependent(this._oProjectDialog);
            }

            this._oProjectDialog.open();
        },

        onCloseProjectDialog: function () {
            this._resetProjectForm();
            this._oProjectDialog.close();
        },

        onAddRequiredSkill: function () {
            const oModel = this.getView().getModel("projectModel");
            const aSkills = oModel.getProperty("/skills") || [];

            aSkills.push({
                skill_ID: "",
                REQUIRED_LEVEL: "BEGINNER",
                REQUIRED_RESOURCES: 1
            });

            oModel.setProperty("/skills", aSkills);
        },

        onDeleteRequiredSkill: function (oEvent) {
            const oModel = this.getView().getModel("projectModel");
            const aSkills = oModel.getProperty("/skills");

            const iIndex = this.byId("requiredSkillsTable")
                .indexOfItem(oEvent.getSource().getParent());

            aSkills.splice(iIndex, 1);
            oModel.setProperty("/skills", aSkills);
        },

        onSaveProject: async function () {

            const oModel = this.getView().getModel();
            const oDialog = this._oProjectDialog;

            const aSkills = this.getView()
                .getModel("projectModel")
                .getProperty("/skills");

            const sName = this.byId("projectName").getValue();

            if (!sName) {
                MessageToast.show("Project Name is required");
                return;
            }

            const oPayload = {
                PROJECT_NAME: sName,
                DESCRIPTION: this.byId("projectDescription").getValue(),
                START_DATE: this.byId("projectStartDate")
                    .getDateValue()
                    ?.toISOString()
                    .split("T")[0],
                END_DATE: this.byId("projectEndDate")
                    .getDateValue()
                    ?.toISOString()
                    .split("T")[0],
                STATUS: this.byId("projectStatus").getSelectedKey(),
                manager_ID: this.byId("projectManager").getSelectedKey(),

                requirements: [{
                    requirementSkills: aSkills.map(function (s) {
                        return {
                            skill_ID: s.skill_ID,
                            REQUIRED_LEVEL: s.REQUIRED_LEVEL,
                            REQUIRED_RESOURCES: s.REQUIRED_RESOURCES
                        };
                    })
                }]
            };

            oDialog.setBusy(true);

            try {
                const oContext = oModel.bindList("/PROJECTS").create(oPayload);
                await oContext.created();

                MessageToast.show("Project Created Successfully");
                this._resetProjectForm();

                oDialog.close();
                oModel.refresh();

            } catch (e) {
                MessageBox.error(e.message || "Project Creation Failed");
            } finally {
                oDialog.setBusy(false);
            }
        },

        onViewProject: function (oEvent) {
            const sId = oEvent.getSource()
                .getBindingContext()
                .getProperty("ID");

            const oFCL = this.getOwnerComponent()
                .getRootControl()
                .byId("fcl");

            oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);

            this.getOwnerComponent()
                .getRouter()
                .navTo("ProjectDetail", {
                    projectId: sId
                });
        },

        onProjectSearch: function (oEvent) {
            const sValue = oEvent.getParameter("newValue");
            const oTable = this.byId("projectsTable");
            const oBinding = oTable.getBinding("items");

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const aFilters = [
                new Filter("PROJECT_ID", FilterOperator.Contains, sValue),
                new Filter("PROJECT_NAME", FilterOperator.Contains, sValue),
                new Filter("DESCRIPTION", FilterOperator.Contains, sValue),
                new Filter("STATUS", FilterOperator.Contains, sValue)
            ];

            oBinding.filter(new Filter({
                filters: aFilters,
                and: false
            }));
        },
        _resetProjectForm: function () {

            this.byId("projectName").setValue("");
            this.byId("projectDescription").setValue("");

            this.byId("projectStartDate").setValue("");
            this.byId("projectEndDate").setValue("");

            this.byId("projectStatus").setSelectedKey("ACTIVE");
            this.byId("projectManager").setSelectedKey("");

            this.getView().getModel("projectModel").setProperty("/skills", []);

        }

    });
});