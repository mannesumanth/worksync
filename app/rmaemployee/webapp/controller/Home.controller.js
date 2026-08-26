sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/mvc/XMLView"
], function (Controller, XMLView) {
    "use strict";

    return Controller.extend(
        "com.amista.rmaemployee.controller.Home",
        {
            onInit: function () {
                // Store dynamically created views
                this._views = {};
                // Load Employee Details initially
                this._loadEmployeeDetails();
            },
            // SIDE NAVIGATION
            onNavigationSelect: function (oEvent) {
                const oItem = oEvent.getParameter("item");
                const sKey = oItem.getKey();
                switch (sKey) {

                    case "employeeDetails":
                        this._loadEmployeeDetails();
                        break;

                    case "projects":
                        this._loadProjects();
                        break;

                    case "leave":
                        this._loadLeave();
                        break;
                }
            },
            // EMPLOYEE DETAILS
            _loadEmployeeDetails: function () {
                this._loadView("EmployeeDetails","employeeDetails");
            },
            // PROJECTS
            _loadProjects: function () {
                this._loadView("Projects","projects");
            },
            // LEAVE
            _loadLeave: function () {
                this._loadView("Leave","leave");
            },
            // LOAD / REUSE VIEW
            _loadView: async function (sViewName, sViewId) {

                const oNavContainer = this.byId("employeeNavContainer");
                if (!oNavContainer) {
                    return;
                }
                // If view already exists, reuse it
                if (this._views[sViewId]) {
                    const oExistingView =
                        this._views[sViewId];
                    oNavContainer.to(oExistingView);
                    return;
                }
                try {
                    // Create view with Home view ID scope
                    const oView = await XMLView.create({
                        id: this.createId(sViewId),
                        viewName:
                            "com.amista.rmaemployee.view." +
                            sViewName

                    });
                    // Set EmployeeService OData V4 model
                    oView.setModel(
                        this.getOwnerComponent().getModel()
                    );
                    // Store view for reuse
                    this._views[sViewId] = oView;
                    // Add to NavContainer
                    oNavContainer.addPage(oView);
                    // Load controller data
                    const oController =oView.getController();
                    if (oController &&typeof oController.loadData === "function") {
                        await oController.loadData();
                    }
                    // Navigate
                    oNavContainer.to(oView);
                } catch (oError) {
                    console.error(
                        "Error loading view:",
                        sViewName,
                        oError
                    );
                }
            }
    });
});