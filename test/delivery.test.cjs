const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class JSONModel {
    constructor(data) { this.data = data; }
    setData(data) { this.data = data; }
    getProperty(key) { return this.data[key.slice(1)]; }
    setProperty(key, value) { this.data[key.slice(1)] = value; }
    setSizeLimit(limit) { this.limit = limit; }
}

class Filter {
    constructor(field, operator, value) {
        Object.assign(this, { field, operator, value });
    }
}

function controller(file) {
    let definition;
    const calls = { reads: [], creates: [], messages: [], errors: [], routes: [] };
    const service = {
        read: (entity, options) => calls.reads.push({ entity, options }),
        create: (entity, data, options) => calls.creates.push({ entity, data, options })
    };
    const view = {
        setModel: function (model) { this.page = model; },
        getModel: function (name) { return name === "page" ? this.page : service; }
    };
    const utils = {
        scan: (bundle, done) => { calls.scanDone = done; },
        showError: (bundle, key, error) => calls.errors.push({ key, error })
    };
    const dependencies = {
        "zsddeliverychk/controller/BaseController": { extend: (name, methods) => methods },
        "sap/ui/core/routing/History": { getInstance: () => ({ getPreviousHash: () => undefined }) },
        "sap/ui/model/json/JSONModel": JSONModel,
        "sap/ui/model/Filter": Filter,
        "sap/ui/model/FilterOperator": { EQ: "EQ" },
        "sap/m/MessageToast": { show: (message) => calls.messages.push(message) },
        "zsddeliverychk/model/serviceUtils": utils
    };
    const source = fs.readFileSync(path.join(__dirname, "..", "webapp", "controller", file), "utf8");
    vm.runInNewContext(source, {
        sap: { ui: { define: (deps, factory) => { definition = factory(...deps.map((dep) => dependencies[dep])); } } },
        encodeURIComponent,
        decodeURIComponent
    });
    const instance = Object.assign({}, definition, {
        getView: () => view,
        getResourceBundle: () => ({ getText: (key) => key }),
        getRouter: () => ({
            getRoute: () => ({ attachPatternMatched: () => {} }),
            navTo: (...args) => calls.routes.push(args)
        })
    });
    instance.onInit();
    return { instance, view, calls };
}

function route(instance, vbeln) {
    instance._onRouteMatched({ getParameter: () => ({ vbeln: encodeURIComponent(vbeln) }) });
}

test("delivery search filters by Vbeln and ignores stale responses", () => {
    const { instance, view, calls } = controller("Main.controller.js");
    view.page.setProperty("/search", " 80001 ");
    instance.onSearch();
    assert.equal(calls.reads[0].entity, "/CheckHeaderSet");
    assert.equal(calls.reads[0].options.filters[0].value, "80001");
    view.page.setProperty("/search", "80002");
    instance.onSearch();
    calls.reads[1].options.success({ results: [{ Vbeln: "80002" }] });
    calls.reads[0].options.success({ results: [{ Vbeln: "80001" }] });
    assert.equal(view.page.getProperty("/headers")[0].Vbeln, "80002");
    instance.onHeaderPress({ getSource: () => ({ getBindingContext: () => ({ getProperty: () => "80002" }) }) });
    assert.equal(calls.routes[0][0], "RouteItems");
    assert.equal(calls.routes[0][1].vbeln, "80002");
});

test("scan searches for the scanned delivery and cancellation does nothing", () => {
    const { instance, view, calls } = controller("Main.controller.js");
    instance.onScan();
    calls.scanDone(null);
    assert.equal(calls.reads.length, 0);
    instance.onScan();
    calls.scanDone("80001");
    assert.equal(calls.reads[0].options.filters[0].value, "80001");
    assert.equal(view.page.getProperty("/scanning"), false);
});

test("item scan posts only the selected delivery and unmodified QR text then reloads", () => {
    const { instance, view, calls } = controller("Items.controller.js");
    route(instance, "80001");
    assert.equal(calls.reads[0].entity, "/CheckItemsSet");
    assert.equal(calls.reads[0].options.filters[0].value, "80001");
    instance.onScan();
    calls.scanDone(" QR content ");
    assert.equal(calls.creates[0].entity, "/CheckItemsSet");
    assert.equal(JSON.stringify(calls.creates[0].data), JSON.stringify({ Vbeln: "80001", Barcode: " QR content " }));
    instance.onCreateItem();
    assert.equal(calls.creates.length, 1);
    calls.creates[0].options.success();
    assert.equal(calls.reads.length, 2);
    calls.reads[1].options.success({ results: [{ Posnr: "10" }] });
    calls.reads[0].options.success({ results: [{ Posnr: "old" }] });
    assert.equal(view.page.getProperty("/items")[0].Posnr, "10");
    assert.equal(view.page.getProperty("/barcode"), "");
});

test("creation failures retain the barcode and are shown", () => {
    const { instance, view, calls } = controller("Items.controller.js");
    route(instance, "80001");
    view.page.setProperty("/barcode", "ABC");
    instance.onCreateItem();
    calls.creates[0].options.error({ message: "failed" });
    assert.equal(view.page.getProperty("/barcode"), "ABC");
    assert.equal(view.page.getProperty("/posting"), false);
    assert.equal(calls.errors[0].key, "itemCreateError");
    assert.equal(calls.reads.length, 1);
});

test("old delivery reads and scans cannot update a new delivery", () => {
    const { instance, view, calls } = controller("Items.controller.js");
    route(instance, "80001");
    instance.onScan();
    const done = calls.scanDone;
    route(instance, "80002");
    done("old barcode");
    calls.reads[0].options.success({ results: [{ Vbeln: "80001" }] });
    assert.equal(view.page.getProperty("/vbeln"), "80002");
    assert.equal(view.page.getProperty("/items").length, 0);
    assert.equal(calls.creates.length, 0);
});

test("empty values do not issue service requests and read errors are reported", () => {
    const main = controller("Main.controller.js");
    main.instance.onSearch();
    assert.equal(main.calls.reads.length, 0);
    assert.equal(main.calls.messages[0], "deliveryRequired");
    const detail = controller("Items.controller.js");
    route(detail.instance, "80001");
    detail.instance.onCreateItem();
    assert.equal(detail.calls.creates.length, 0);
    assert.equal(detail.calls.messages[0], "barcodeRequired");
    detail.calls.reads[0].options.error({ message: "failed" });
    assert.equal(detail.calls.errors[0].key, "itemsLoadError");
    assert.equal(detail.view.page.getProperty("/loading"), false);
});
