sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller,
    Fragment,
    MessageToast,
    MessageBox,
    Filter,
    FilterOperator
) {
    "use strict";

    return Controller.extend("com.amista.worksyncui.controller.admin.Skill", {
        // Skill Category
        onOpenSkillCategoryDialog: async function () {
            if (!this._oSkillCategoryDialog) {
                this._oSkillCategoryDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.AddSkillCategory",
                    controller: this
                });
                this.getView().addDependent(this._oSkillCategoryDialog);
            }
            this._oSkillCategoryDialog.open();
        },
        onCloseSkillCategory: function () {
            this._oSkillCategoryDialog.close();
        },
        onSaveSkillCategory: async function () {
            const oPayload = {
                CATEGORY_NAME: this.byId("categoryNameInput").getValue()
            };
            if (!oPayload.CATEGORY_NAME) {
                MessageToast.show("Category Name is required");
                return;
            }
            try {
                const oCtx = this.getView()
                    .getModel()
                    .bindList("/SKILL_CATEGORIES")
                    .create(oPayload);
                await oCtx.created();
                MessageToast.show("Skill Category Created");
                this.byId("skillCategoriesTable")
                    .getBinding("items")
                    .refresh();
                this._oSkillCategoryDialog.close();
            } catch (e) {
                MessageBox.error(e.message || "Failed to create Skill Category");
            }
        },
        onEditSkillCategory: function () {
            this._editSelected(
                "skillCategoriesTable",
                "CATEGORY_NAME"
            );
        },
        onDeleteSkillCategory: function () {
            this._deleteSelected("skillCategoriesTable");
        },
        // Skill
        onOpenSkillDialog: async function () {
            if (!this._oSkillDialog) {
                this._oSkillDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.amista.worksyncui.view.fragments.AddSkill",
                    controller: this
                });
                this.getView().addDependent(this._oSkillDialog);
            }
            this._oSkillDialog.open();
        },
        onCloseSkill: function () {
            this._oSkillDialog.close();
        },
        onSaveSkill: async function () {
            const oPayload = {
                SKILL_NAME: this.byId("skillNameInput").getValue(),
                category_ID: this.byId("skillCategoryCombo").getSelectedKey()
            };
            if (!oPayload.SKILL_NAME) {
                MessageToast.show("Skill Name is required");
                return;
            }
            try {
                const oCtx = this.getView()
                    .getModel()
                    .bindList("/SKILLS")
                    .create(oPayload);
                await oCtx.created();
                MessageToast.show("Skill Created");
                this.byId("skillsTable")
                    .getBinding("items")
                    .refresh();
                this._oSkillDialog.close();

            } catch (e) {
                MessageBox.error(e.message || "Failed to create Skill");
            }
        },

        onEditSkill: function () {
            this._editSelected(
                "skillsTable",
                "SKILL_NAME"
            );
        },

        onDeleteSkill: function () {
            this._deleteSelected("skillsTable");
        },
        //Helpers 
        _editSelected: function (sTableId, sField) {

            const oTable = this.byId(sTableId);
            const oItem = oTable.getSelectedItem();

            if (!oItem) {
                MessageToast.show("Please select a row.");
                return;
            }

            const oContext = oItem.getBindingContext();

            MessageBox.prompt("Edit value", {
                initialValue: oContext.getProperty(sField),

                onClose: async (sAction, sValue) => {

                    if (
                        sAction === MessageBox.Action.OK &&
                        sValue
                    ) {

                        try {

                            await oContext.setProperty(
                                sField,
                                sValue
                            );

                            await this.getView()
                                .getModel()
                                .submitBatch("$auto");

                            MessageToast.show("Updated successfully");

                        } catch (e) {
                            MessageBox.error(
                                e.message || "Update failed"
                            );
                        }
                    }
                }
            });
        },

        _deleteSelected: function (sTableId) {

            const oTable = this.byId(sTableId);
            const oItem = oTable.getSelectedItem();

            if (!oItem) {
                MessageToast.show("Please select a row.");
                return;
            }

            MessageBox.confirm(
                "Are you sure you want to delete this record?",
                {
                    actions: [
                        MessageBox.Action.YES,
                        MessageBox.Action.NO
                    ],

                    onClose: async (sAction) => {

                        if (sAction !== MessageBox.Action.YES) {
                            return;
                        }

                        try {

                            await oItem
                                .getBindingContext()
                                .delete("$auto");

                            MessageToast.show("Deleted successfully");

                        } catch (e) {
                            MessageBox.error(
                                e.message || "Delete failed"
                            );
                        }
                    }
                }
            );
        }

    });
});