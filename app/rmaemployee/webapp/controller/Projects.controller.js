sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (
    Controller,
    JSONModel,
    MessageBox,
    Fragment
) {
    "use strict";

    return Controller.extend(
        "com.amista.rmaemployee.controller.Projects",
        {

            onInit: function () {

                this.getView().setModel(
                    new JSONModel([]),
                    "projects"
                );

                this.getView().setModel(
                    new JSONModel([]),
                    "projectHistory"
                );

                this.getView().setModel(
                    new JSONModel({}),
                    "projectDetails"
                );

                this.getView().setModel(
                    new JSONModel([]),
                    "projectTeam"
                );
            },

            loadData: function () {

                this._loadProjects();
                this._loadProjectHistory();

            },

            _loadProjects: async function () {

                try {

                    const oModel =
                        this.getView().getModel();

                    if (!oModel) {
                        throw new Error(
                            "OData V4 model is not available."
                        );
                    }

                    const oBinding =
                        oModel.bindList("/MyProjects");

                    const aContexts =
                        await oBinding.requestContexts(
                            0,
                            100
                        );

                    const aProjects =
                        aContexts.map(function (oContext) {
                            return oContext.getObject();
                        });

                    this.getView()
                        .getModel("projects")
                        .setData(aProjects);

                } catch (oError) {

                    console.error(
                        "Error loading employee projects:",
                        oError
                    );

                    MessageBox.error(
                        "Unable to load projects."
                    );
                }
            },

            _loadProjectHistory: async function () {

                try {

                    const oModel =
                        this.getView().getModel();

                    if (!oModel) {
                        throw new Error(
                            "OData V4 model is not available."
                        );
                    }

                    const oBinding =
                        oModel.bindList(
                            "/AllocationHistory"
                        );

                    const aContexts =
                        await oBinding.requestContexts(
                            0,
                            100
                        );

                    const aHistory =
                        aContexts.map(function (oContext) {
                            return oContext.getObject();
                        });

                    this.getView()
                        .getModel("projectHistory")
                        .setData(aHistory);

                } catch (oError) {

                    console.error(
                        "Error loading project history:",
                        oError
                    );

                    MessageBox.error(
                        "Unable to load project history."
                    );
                }
            },

            onCurrentProjectPress: async function (oEvent) {

                const oContext =
                    oEvent
                        .getSource()
                        .getBindingContext("projects");

                if (!oContext) {
                    MessageBox.error(
                        "Project information is not available."
                    );
                    return;
                }

                const oProject =
                    oContext.getObject();

                if (!oProject.project_ID) {
                    MessageBox.error(
                        "Project information is not available."
                    );
                    return;
                }

                await this._getProjectDetails(
                    oProject.project_ID,
                    false
                );
            },

            onProjectHistoryPress: async function (oEvent) {

                const oContext =
                    oEvent
                        .getSource()
                        .getBindingContext(
                            "projectHistory"
                        );

                if (!oContext) {
                    MessageBox.error(
                        "Project information is not available."
                    );
                    return;
                }

                const oProject =
                    oContext.getObject();

                if (!oProject.project_ID) {
                    MessageBox.error(
                        "Project information is not available."
                    );
                    return;
                }

                await this._getProjectDetails(
                    oProject.project_ID,
                    true
                );
            },

            _getProjectDetails: async function (
                sProjectId,
                bHistory
            ) {

                try {

                    const oModel =
                        this.getView().getModel();

                    if (!oModel) {
                        throw new Error(
                            "OData V4 model is not available."
                        );
                    }

                    const sAction =
                        bHistory
                            ? "/GetMyProjectHistoryDetails(...)"
                            : "/GetMyCurrentProjectDetails(...)";

                    const oOperation =
                        oModel.bindContext(sAction);

                    oOperation.setParameter(
                        "projectId",
                        sProjectId
                    );

                    await oOperation.execute();

                    const oResult =
                        oOperation
                            .getBoundContext()
                            .getObject();

                    if (!oResult) {
                        MessageBox.warning(
                            "Project details not found."
                        );
                        return;
                    }

                    this.getView()
                        .getModel("projectDetails")
                        .setData(oResult);

                    if (bHistory) {

                        await this._openProjectHistoryDialog();

                    } else {

                        this.getView()
                            .getModel("projectTeam")
                            .setData(
                                oResult.TEAM_MEMBERS || []
                            );

                        await this._openCurrentProjectDialog();
                    }

                } catch (oError) {

                    console.error(
                        "Error loading project details:",
                        oError
                    );

                    MessageBox.error(
                        oError.message ||
                        "Unable to load project details."
                    );
                }
            },

            _openCurrentProjectDialog: async function () {
                if (!this._oCurrentProjectDialog) {
                    this._oCurrentProjectDialog =
                        await Fragment.load({
                            id: this.getView().getId(),
                            name:
                                "com.amista.rmaemployee.view.fragments.ProjectDetails",
                            controller: this
                        });

                    this.getView().addDependent(
                        this._oCurrentProjectDialog
                    );
                }
                this._oCurrentProjectDialog.open();
            },
            _openProjectHistoryDialog: async function () {

                if (!this._oProjectHistoryDialog) {

                    this._oProjectHistoryDialog =
                        await Fragment.load({
                            id: this.getView().getId(),
                            name:
                                "com.amista.rmaemployee.view.fragments.ProjectHistoryDetails",
                            controller: this
                        });

                    this.getView().addDependent(
                        this._oProjectHistoryDialog
                    );
                }
                this._oProjectHistoryDialog.open();
            },

            onCloseCurrentProject: function () {

                if (this._oCurrentProjectDialog) {
                    this._oCurrentProjectDialog.close();
                }
            },

            onCloseProjectHistory: function () {

                if (this._oProjectHistoryDialog) {
                    this._oProjectHistoryDialog.close();
                }
            },

            onExit: function () {

                if (this._oCurrentProjectDialog) {
                    this._oCurrentProjectDialog.destroy();
                    this._oCurrentProjectDialog = null;
                }

                if (this._oProjectHistoryDialog) {
                    this._oProjectHistoryDialog.destroy();
                    this._oProjectHistoryDialog = null;
                }
            }
        }
    );
});