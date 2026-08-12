// sap.ui.define([
//     "sap/ui/core/mvc/Controller",
//     "sap/ui/core/Fragment",
//     "sap/m/MessageToast",
//     "sap/m/MessageBox",
//     "sap/ui/model/Filter",
//     "sap/ui/model/FilterOperator",
//     "sap/ui/model/json/JSONModel"
// ], function (
//     Controller,
//     Fragment,
//     MessageToast,
//     MessageBox,
//     Filter,
//     FilterOperator,
//     JSONModel
// )  {
//     "use strict";

//     return Controller.extend("com.amista.worksyncui.controller.EditProject", {

//         onInit: function () {
//             const oRouter = this.getOwnerComponent().getRouter();
//             oRouter.getRoute("EditProject").attachPatternMatched(this._onRouteMatched, this);
//         },

//         _onRouteMatched: function (oEvent) {
//             const sProjectId = oEvent.getParameter("arguments").projectId;
//             const oModel = this.getView().getModel("projectModel");

//             // Fetch project data based on the projectId and set it to the model
//             this._fetchProjectData(sProjectId).then((oProjectData) => {
//                 oModel.setData(oProjectData);
//             }).catch((error) => {
//                 MessageBox.error("Failed to fetch project data: " + error.message);
//             });
//         },

//         _fetchProjectData: async function (sProjectId) {
//             // Implement the logic to fetch project data from the backend using the projectId
//             // This is a placeholder for demonstration purposes
//             return new Promise((resolve, reject) => {
//                 // Simulate an API call
//                 setTimeout(() => {
//                     if (sProjectId) {
//                         resolve({
//                             ID: sProjectId,
//                             name: "Sample Project",
//                             description: "This is a sample project.",
//                             skills: []
//                         });
//                     } else {
//                         reject(new Error("Invalid project ID"));
//                     }
//                 }, 1000);
//             });
//         },
//     });
// });