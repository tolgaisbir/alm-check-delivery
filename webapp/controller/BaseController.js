sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	'sap/ui/model/json/JSONModel',
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/m/MessageItem",
	"sap/m/MessageView"
], function (Controller, History, JSONModel, Toast, MessageBox, MessageItem, MessageView) {
	"use strict";
	var messageViewTemplate = new sap.m.MessagePopoverItem({
		type: "{type}",
		title: "{title}",
		description: "{description}",
		subtitle: "{subtitle}",
		counter: "{counter}",
		groupName: "{group}",
		link: null
	});
	return Controller.extend("zsddeliverychk.controller.BaseController", {
		setModel: function () {
			var oModel = new sap.ui.model.odata.v2.ODataModel('/sap/opu/odata/sap/ZSD_CHECK_DELIVERY_SRV/');
			this.oModel = oModel;
			this._oView.setModel(oModel);
			sap.ui.getCore().setModel(oModel);
		},
		getModel: function (name) {
			return this.getView().getModel(name);
		},
		getRouter: function () {
			// return this.getOwnerComponent().getRouter();
			return sap.ui.core.UIComponent.getRouterFor(this);
		},
		getValueHelp: function (that, obj) {
			var columns = [];
			for (var i = 0; i < obj.listTitles.length; i++) {
				var column = obj.listTitles[i];
				columns.push(column);
			}
			var sModel = new sap.ui.model.json.JSONModel({
				searchList: [],
				searchColls: columns
			});

			var dialog = new sap.m.Dialog({
				stretchOnPhone: true,
				showHeader: false,
				contentWidth: (obj.listTitles.length * 15).toString() + "rem",
				beginButton: new sap.m.Button({
					text: "{i18n>close}",
					press: function (evt) {
						dialog.close();
						dialog.destroy();
						dialog = undefined;
					}.bind(this)
				})

			});
			var submitValue = function (e) {
				var oModel = that.getView().getModel();
				that.showBusy();
				var filter = [];
				if (e && e.getSource() && e.getSource().getValue()) {
					obj.filtersField.forEach(function (val) {
						filter.push(new sap.ui.model.Filter(val, sap.ui.model.FilterOperator.Contains, e.getSource().getValue()));
					});
				}
				if (obj.defaultFilter) {
					obj.defaultFilter.forEach(function (val) {
						filter.push(val);
					});
				}
				oModel.read(obj.entitySet, {
					filters: filter,
					sorters: obj.sorters,
					success: function (oData) {
						oTable.getModel().setProperty("/searchList", oData.results);
						that.SearchHelpbindItems(that, oTable, obj.updatePats, obj.listTitles, obj.afterSelect);
						that.SearchHelpbindAggregation(oTable);
						that.hideBusy();
					},
					error: function (err) {
						that.hideBusy();
						that.showPopupMsgFromResponseText(err.responseText);
					}
				});
			};
			var search = new sap.m.Input(undefined, {
				placeholder: "Search...",
				submit: submitValue
			});
			this.destroyObj("searchTable");
			var oTable = new sap.m.Table({
				headerToolbar: new sap.m.OverflowToolbar({
					content: [new sap.m.Label({
						text: obj.title
					}), new sap.m.ToolbarSpacer()]
				})
			});
			oTable.setModel(sModel);
			var sc = new sap.m.ScrollContainer();
			sc.addContent(oTable);
			if (obj.showListInit) {
				submitValue();
			}
			dialog.addContent(search);
			dialog.addContent(sc);
			that._oView.addDependent(dialog);
			dialog.open();
		},
		checkStatus: function (oEvent) {
			oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
		},
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},
		checkMandatoryFields: function (that, IDs, check) {
			var rt = true;
			IDs.forEach(id => {
				const element = that.getView().byId(id);
				element.setValueState(sap.ui.core.ValueState.None);
				if (check == true) {
					switch (element.getMetadata().getName()) {
						case 'sap.m.Input':
						case 'sap.m.DatePicker':
						case 'sap.m.ComboBox':
							if (element.getValue().length == 0 || (Number.parseInt(element.getValue()) === 0 && element.getBindingInfo("value")?.type?.getName() == "Float")) {
								element.setValueState(sap.ui.core.ValueState.Error);
								element.setValueStateText(that.getResourceBundle().getText("checkMandatory"));
								rt = false;
							}
							break;
						case 'sap.m.Select':
							if (element.getSelectedKey().length == 0) {
								element.setValueState(sap.ui.core.ValueState.Error);
								element.setValueStateText(that.getResourceBundle().getText("checkMandatory"));
								rt = false;
							}
							break;

					}
				}
			})
			if (rt === false) {
				sap.m.MessageToast.show(this.getResourceBundle().getText("checkMandatory"))
			}
			return rt;
		},
		SearchHelpbindAggregation: function (table) {
			table.bindAggregation("columns", "/searchColls", function (index, context) {
				return new sap.m.Column({
					header: new sap.m.Label({
						text: context.getObject().text
					}),
					width: "7rem"
				});
			});
		},
		SearchHelpbindItems: function (that, table, path, listTitles, afterSelect) {
			table.bindItems("/searchList", function (index, context) {
				var obj = context.getObject();
				var row = new sap.m.ColumnListItem();
				for (var k = 0; k < listTitles.length; k++) {
					var text;
					switch (typeof obj[listTitles[k].col]) {
						case "string":
							text = obj[listTitles[k].col];
							break;
						case "boolean":
						text = obj[listTitles[k].col] === true ? "Yes" : "No";
							break;
					}
					var c = new sap.m.Text(undefined, {
						text: text,
						maxLines: 3
					});
					row.addCell(c);
				}
				row.setType(sap.m.ListType.Navigation);
				row.attachPress(function (e) {
					path.forEach(function (cV) {
						that.getView().getModel("oModel").setProperty(cV.path, e.getSource().getModel().getProperty(e.getSource().getBindingContextPath())[
							cV.selValue]);
					});
					if (afterSelect) {
						afterSelect();
					}
					e.getSource().getParent().getParent().getParent().close();
				}, that);
				row.setModel(obj, "row");
				return row;
			});
		},
		showBusy: function () {
			sap.ui.core.BusyIndicator.show();
		},
		hideBusy: function () {
			sap.ui.core.BusyIndicator.hide();
		},
		showToast: function (m) {
			Toast.show(m);
		},
		showToastErr: function (e) {
			Toast.show(e.message + " " + e.response.statusCode + " " + e.response.statusText);
		},
		showPopupMsg: function (message, onClose) {
			MessageBox.show(
				message, {
				//styleClass: bCompact ? "sapUiSizeCompact" : "",
				actions: [MessageBox.Action.OK],
				onClose: onClose
			});
		},
		showPopupMsgFromResponseText: function (responseText, onClose) {
			var messageJson = JSON.parse(responseText);
			var message = messageJson.error.message.value + " \n";
			MessageBox.show(
				message, {
				actions: [MessageBox.Action.OK],
				onClose: onClose
			});

		},
		showPopupMsgFromBody: function (body, onClose) {
			var xmlString = body;
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(xmlString, "text/xml");
			var message = "";
			for (var i = 0; i < xmlDoc.getElementsByTagName('message').length; i++) {
				message += xmlDoc.getElementsByTagName('message')[i].childNodes[0].nodeValue + " \n";
			}
			MessageBox.show(
				message, {
				//styleClass: bCompact ? "sapUiSizeCompact" : "",
				actions: [MessageBox.Action.OK],
				onClose: onClose
			});

		},
		showPopupMsgFromBody1: function (r, body, onClose) {
			var xmlString = body;
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(xmlString, "text/xml");
			var aMockMessages = [];
			if (xmlDoc.getElementsByTagName("errordetails")[0].childNodes.length > 0) {
				var terror = xmlDoc.getElementsByTagName("errordetails")[0].childNodes;
				for (var i = 0; i < terror.length; i++) {
					var messages = {};
					switch (terror[i].childNodes[3].textContent) {
						case "error":
							messages.type = "Error";
							break;
						case "warning":
							messages.type = "Warning";
							break;
						case "info":
							messages.type = "Information";
							break;
						default:
							messages.type = "Error";
							break;
					}

					messages.description = terror[i].childNodes[1].textContent;
					messages.title = terror[i].childNodes[1].textContent;
					aMockMessages.push(messages);
				}
			} else if (xmlDoc.getElementsByTagName("message")) {
				var messages = {};
				messages.type = "Error";
				messages.description = xmlDoc.getElementsByTagName("message")[0].textContent;
				messages.title = xmlDoc.getElementsByTagName("message")[0].textContent;
				aMockMessages.push(messages);
			}

			if (!r.oDialog) {
				var oMessageTemplate = new MessageItem({
					type: '{type}',
					title: '{title}',
					description: '{description}'
				});
				var oModel = new JSONModel();
				oModel.setData(aMockMessages);
				r.oMessageView = new MessageView({
					showDetailsPageHeader: false,
					itemSelect: function () {
						oBackButton.setVisible(true);
					},
					items: {
						path: "/",
						template: oMessageTemplate
					}
				});

				var oBackButton = new sap.m.Button({
					icon: sap.ui.core.IconPool.getIconURI("nav-back"),
					visible: false,
					press: function () {
						r.oMessageView.navigateBack();
						this.setVisible(false);
					}
				});
				r.oMessageView.setModel(oModel);
				r.oDialog = new sap.m.Dialog({
					resizable: true,
					content: r.oMessageView,
					state: 'Error',
					beginButton: new sap.m.Button({
						press: function () {
							this.getParent().close();
						},
						text: "Close"
					}),
					customHeader: new sap.m.Bar({
						contentMiddle: [
							new Text({
								text: "Error"
							})
						],
						contentLeft: [oBackButton]
					}),
					contentHeight: "300px",
					contentWidth: "500px",
					verticalScrolling: false
				});
			} else {
				r.oMessageView.getModel().setData(aMockMessages);
			}
			r.oMessageView.navigateBack();
			r.oDialog.open();
			return aMockMessages;
		},
		showMsg: function (data) {
			var r = this;
			var Msg = JSON.parse(data);

			var oMessageTemplate = new sap.m.MessagePopoverItem({
				type: '{type}',
				title: '{title}',
				description: '{description}',
				subtitle: '{subtitle}'
			});

			if (r.oMessagePopover) {
				r.oMessagePopover.close();
			}

			var oMessagePopover = new sap.m.MessagePopover({
				items: {
					path: '/',
					template: oMessageTemplate
				}
			});

			r.oMessagePopover = oMessagePopover;

			var aMockMessages = [];
			var aMessages = {};
			for (var i = 0; i < Msg.length; i++) {

				switch (Msg[i].type) {
					case "E":
					case "X":
					case "A":
						Msg[i].type = 'Error';
						break;
					case "S":
						Msg[i].type = 'Success';
						break;
					case "W":
						Msg[i].type = 'Warning';
						break;
					case "I":
						Msg[i].type = 'Information';
						break;
				}

				aMessages = {
					type: Msg[i].type,
					title: Msg[i].type,
					description: Msg[i].id + " " + Msg[i].number + "\n" + Msg[i].message,
					subtitle: Msg[i].message
				};
				aMockMessages.push(aMessages);
			}

			var aModel = new sap.ui.model.json.JSONModel();
			aModel.setData(aMockMessages);

			var viewModel = new sap.ui.model.json.JSONModel();
			viewModel.setData({
				messagesLength: aMockMessages.length + ''
			});

			r.getView().setModel(viewModel);
			oMessagePopover.setModel(aModel);

			r.byId("MsgButton").firePress();

		},

		clearMsgPopover: function () {
			if (this.oMessagePopover && this.oMessagePopover !== undefined) {
				this.oMessagePopover.destroyItems();
				this.oMessagePopover.close();
			}
			this.byId("MsgButton").setText();
		},

		handleMessagePopoverPress: function (oEvent) {
			var r = this;
			if (r.oMessagePopover) {
				r.oMessagePopover.openBy(oEvent.getSource());
			}
		},
		_getViewModel: function (oModel) {
			var oViewModel = this._oView.getModel(oModel);
			return oViewModel;
		},

		_setViewModelProperty: function (oModel, oPropertyName, oValue) {
			oPropertyName = "/" + oPropertyName;
			this._getViewModel(oModel).setProperty(oPropertyName, oValue);
		},

		_getViewModelProperty: function (oModel, oPropertyName) {
			oPropertyName = "/" + oPropertyName;
			var oValue = this._getViewModel(oModel).getProperty(oPropertyName);
			return oValue;
		},
		_fixUtcProblem: function (oDate) {
			if (oDate) {
				return new Date(oDate.getTime() - oDate.getTimezoneOffset() * 60 * 1000);
			} else {
				return oDate;
			}
		},
		creatObj: function (r, _obj, _name, _properties) {
			r.destroyObj(_name);
			try {
				return new _obj(_name, _properties);
			} catch (e) {
				console.log(e);
			}

		},
		destroyObj: function (_name) {
			if (sap.ui.getCore().byId(_name)) {
				sap.ui.getCore().byId(_name).destroy();
			}
		},
		formatDate: function (v) {
			if (v !== undefined) {
				jQuery.sap.require("sap.ui.core.format.DateFormat");
				var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "dd.MM.YYYY"
				});
				v = new Date(v);
				return oDateFormat.format(new Date(v));
			}
		},

		handleNavBack: function (e) {
			window.history.go(-1);
		},
		onDialogClose: function (oDialog) {
			oDialog.oSource.getParent().close();
		},
		openDialog: function (r, oDialog, saveCalBack) {
			if (saveCalBack) {
				r._getDialog(r, oDialog).getEndButton().mEventRegistry.press = [];
				r._getDialog(r, oDialog).getEndButton().attachEvent("press", saveCalBack);
			}
			r._getDialog(r, oDialog).open();
		},
		moveCorresponding: function (_from, _to) {
			for (var j in _from) {
				if (j !== "__metadata" && j.substring(0, 7) !== "dontmap") {
					_to[j] = _from[j];
				}
			}
		},
		_getDialog: function (r, _oDialog) {
			var oDialog = r._oView.byId(_oDialog);
			if (!oDialog) {
				oDialog = sap.ui.xmlfragment(r._oView.getId(), "machineconfirmation.view.frag." + _oDialog, r);
				r._oView.addDependent(oDialog);
			}
			return oDialog;
		},
		convertString2Date: function (_object) {
			for (var f in _object) {
				if (typeof _object[f] === "string") {
					if (_object[f].indexOf("T00:00:00") > 0) {
						_object[f] = new Date(_object[f]);
					}
				}
			}
		},
		getUniq: function (array, field) {
			var seen = {};
			return array.filter(function (item) {
				return seen.hasOwnProperty(item[field]) ? false : (seen[item[field]] = true);
			});
		},
		getODataReturnMessageObject: function (oDataReturn) {
			var messageList = [];
			var isError = false;
			if (oDataReturn) {
				for (var i = 0; i < oDataReturn.results.length; i++) {
					var messageType = "Success";
					var messageTitle = "Success";
					var message = oDataReturn.results[i].Message;
					if (oDataReturn.results[i].Type === "E") {
						isError = true;
						messageType = "Error";
						messageTitle = "Error Results";
					}
					messageList.push({
						Message: message,
						MessageType: messageType,
						MessageTitle: messageTitle
					});
				}
			}
			return {
				IsError: isError,
				MessageList: messageList
			};
		},
		showODataReturnMessageList: function (messageObject, onClose) {
			var that = this;
			that.MessageView = undefined;
			that.MessageViewDialog = undefined;
			var oDataReturnMessageList = [];
			if (messageObject.MessageList && messageObject.MessageList.length > 0) {
				for (var i = 0; i < messageObject.MessageList.length; i++) {
					var message = messageObject.MessageList[i].Message;
					oDataReturnMessageList.push({
						type: messageObject.MessageList[i].MessageType,
						title: message.length > 90 ? message.substring(0, 90) : message,
						group: messageObject.MessageList[i].MessageTitle,
						counter: null, // Mesaj adeti
						subtitle: "",
						description: message.length > 90 ? message : "" // Açıklama yazılır ise popup'da navigation detay ve link vs geliyor.
						// link: null // Detay link
					});
				}
			}
			that.getModel("oModel").setProperty("/ODataReturnMessageList", oDataReturnMessageList);
			if (!that.MessageView) {
				var btnBack = new sap.m.Button({
					icon: sap.ui.core.IconPool.getIconURI("nav-back"),
					visible: false,
					press: function () {
						that.MessageView.navigateBack();
						this.setVisible(false);
					}
				});
				//jQuery.sap.require("sap/m/MessageView");	
				that.MessageView = new MessageView({
					showDetailsPageHeader: false,
					itemSelect: function () {
						btnBack.setVisible(true);
					},
					items: {
						path: "/ODataReturnMessageList",
						template: messageViewTemplate
					},
					groupItems: true
				});
				that.MessageView.setModel(that.getModel("oModel"));

				if (!that.MessageViewDialog) {
					that.MessageViewDialog = new sap.m.Dialog({
						resizable: true,
						content: that.MessageView,
						state: messageObject.IsError ? "Error" : "Success",
						beginButton: new sap.m.Button({
							press: function () {
								this.getParent().close();
								that.getModel("oModel").setProperty("/ODataReturnMessageList", []);
								if (onClose) {
									onClose(messageObject.IsError);
								}
							},
							text: "Kapat"
						}),
						customHeader: new sap.m.Bar({
							contentMiddle: [
								new sap.m.Text({
									text: "Mesajlar"
								})
							],
							contentLeft: [btnBack]
						}),
						contentHeight: "333px",
						contentWidth: "500px",
						verticalScrolling: false
					});
				}
			}
			that.MessageViewDialog.setState(messageObject.IsError ? "Error" : "Success");
			var customHeader = that.MessageViewDialog.getCustomHeader();
			var contentMiddle = customHeader.getContentMiddle();
			if (contentMiddle.length > 0) {
				contentMiddle[0].setText(messageObject.IsError ?
					that.getResourceBundle().getText("errorMessageTitle") : that.getResourceBundle().getText("successfulMessageTitle"));
			}
			try {
				that.MessageView.navigateBack();
			} catch (err) { }
			that.MessageViewDialog.open();
		},
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},
		_formatTime: function (isoString) {
			if (!isoString) return "";
			try {
				const d = new Date(isoString);
				return d.toLocaleTimeString("tr-TR", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit"
				});
			} catch {
				return isoString;
			}
		},
		showNumericInputDialog: function (title, placeholder, onConfirm) {
			var oInput = new sap.m.Input({
				type: sap.m.InputType.Number,
				placeholder: placeholder || "Enter value..."
			});
			var oDialog = new sap.m.Dialog({
				title: title || "Enter Value",
				content: [oInput],
				beginButton: new sap.m.Button({
					type: sap.m.ButtonType.Emphasized,
					text: "Confirm",
					press: function () {
						var sValue = oInput.getValue();
						if (sValue && !isNaN(parseFloat(sValue))) {
							oDialog.close();
							onConfirm(parseFloat(sValue));
						} else {
							oInput.setValueState(sap.ui.core.ValueState.Error);
							oInput.setValueStateText("Please enter a valid number.");
						}
					}
				}),
				endButton: new sap.m.Button({
					text: "Cancel",
					press: function () {
						oDialog.close();
					}
				}),
				afterClose: function () {
					oDialog.destroy();
				}
			});
			this.getView().addDependent(oDialog);
			oDialog.open();
		},

		JSONToCSVConvertor: function (ReportTitle, ShowLabel, TableName) {

			var CSV = "";
			var oTable = this.byId(TableName);

			if (ShowLabel) {
				var row = "";
				for (var i = 0; i < oTable.getColumns().length; i++) {
					row += '"' + oTable.getColumns()[i].getHeader().getText() + '";';
				}
				CSV += row + '\r\n';
			}
			for (var i = 0; i < oTable.getItems().length; i++) {
				var row = "";
				for (var j = 0; j < oTable.getItems()[i].getCells().length; j++) {
					try {
						var text = oTable.getItems()[i].getCells()[j].getText();
					}
					catch (e) {
						console.log(e);
					}
					row += '"' + text + '";';
				}
				CSV += row + "\r\n";
			}
			if (CSV == "") {
				alert("Invalid data");
				return;
			}
			var csvString = 'ı,ü,ğ,ş,İ,Ş,Ğ,Ü';
			var universalBOM = "\uFEFF";
			var d = new Date();
			var fileName = d.toLocaleDateString();
			fileName += ReportTitle.replace(/ /g, "_");
			var uri = "data:text/csv;charset=utf-8," + encodeURIComponent(universalBOM + CSV);
			var link = document.createElement("a");
			link.href = uri;
			link.style = "visibility: hidden";
			link.download = fileName + ".csv";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	});

});