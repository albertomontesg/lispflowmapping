define(['app/lispui/lispui.module'], function(lispui) {

    lispui.register.factory('LispuiNodeFormSvc', ['$filter',
        '$location', 'apiBuilder', 'constants',
        'eventDispatcher', 'LispuiUtils', 'nodeWrapper',
        'reqBuilder', 'syncFact', 'YangUIApis', 'yangUtils',
        'YangUtilsRestangular',
        function($filter, $location, apiBuilder, constants,
            eventDispatcher, LispuiUtils, nodeWrapper,
            reqBuilder, syncFact, YangUIApis, yangUtils,
            YangUtilsRestangular) {
            var api = {};

            api.initValues = function(scope) {
                scope.currentPath = 'src/app/yangui/views/';
                scope.apiType = '';
                scope.node = null;
                scope.selApi = null;
                scope.selSubApi = null;
                scope.filterRootNode = null;
                scope.selectedOperation = null;
                return scope;
            };

            ////////// Snippet originally from yangui.controller.js //////////
            // It has been changed to get only the node desired passed as an input of the function [type]
            api.loadNode = function(type, scope) {

                loadingCallback(scope, '');
                yangUtils.generateNodesToApis(function(apis,
                    allNodes) {
                    scope.apis = apis;
                    scope.allNodes = allNodes;
                    console.info('got data', scope.apis,
                        allNodes);
                    scope.treeApis = yangUtils.generateApiTreeData(
                        apis);
                    console.info('tree api', scope.treeApis);

                    // Select the api 'odl-mappingservice'
                    var numApis = scope.apis.length;
                    for (i = 0; i < numApis; i++)
                        if (scope.apis[i].module ==
                            "odl-mappingservice")
                            scope.selApi = scope.apis[
                                i];
                    console.info('selApi:', scope.selApi);

                    if (!scope.selApi) {
                        errorLoadingCallback(scope,
                            'Error loading node'
                        );
                        return null;
                    }

                    // Select the subapi 'type' pass as an argument
                    var numSubApis = scope.selApi.subApis
                        .length;
                    for (j = 0; j < numSubApis; j++)
                        if (scope.selApi.subApis[j]
                            .node.label == type)
                            scope.selSubApi = scope
                            .selApi.subApis[j];
                    console.info('selSubApi:',
                        scope.selSubApi);

                    scope.apiType = scope.selSubApi
                        .pathArray[0].name ===
                        'operational' ?
                        'operational/' : '';
                    scope.node = scope.selSubApi.node;
                    console.info('node:', scope.node);
                    scope.filterRootNode = scope.selSubApi
                        .node;
                    scope.node.clear();
                    if (scope.selSubApi && scope.selSubApi
                        .operations) {
                        scope.selectedOperation =
                            scope.selSubApi.operations[
                                0];
                    }
                    successloadingCallback(scope, '');

                }, function(e) {
                    errorLoadingCallback(scope,
                        'Error loading node');
                    console.error(e);
                });

            };
            ////////// End snippet originally from yangui.controller.js //////////


            ////////// Snippet originally from yangui.controller.js //////////
            api.executeOperation = function(scope) {
                    return function(operation, callback,
                        reqPath) {
                        var reqString = scope.selSubApi.buildApiRequestString(),
                            requestData = {},
                            preparedRequestData = {},
                            headers = {
                                "Content-Type": "application/yang.data+json"
                            };

                        reqString = reqPath ? reqPath.slice(
                            scope.selApi.basePath.length,
                            reqPath.length) : reqString;
                        var requestPath = scope.selApi.basePath +
                            reqString;
                        scope.node.buildRequest(reqBuilder,
                            requestData);
                        angular.copy(requestData,
                            preparedRequestData);
                        preparedRequestData = yangUtils.prepareRequestData(
                            preparedRequestData,
                            operation, reqString, scope
                            .selSubApi);
                        //requestWorkingCallback();

                        operation = operation === 'DELETE' ?
                            'REMOVE' : operation;

                        YangUtilsRestangular.one('restconf')
                            .customOperation(operation.toLowerCase(),
                                reqString, null, headers,
                                preparedRequestData).then(
                                function(data) {
                                    if (operation ===
                                        'REMOVE') {
                                        scope.node.clear();
                                    }

                                    if (data) {
                                        scope.node.clear();
                                        var props = Object.getOwnPropertyNames(
                                            data);

                                        props.forEach(
                                            function(p) {
                                                scope.node
                                                    .fill(
                                                        p,
                                                        data[
                                                            p
                                                        ]
                                                    );
                                            });
                                        scope.node.expanded =
                                            true;
                                    }

                                    successCallback(scope,
                                        scope.selSubApi
                                        .node.label, ''
                                    );

                                    if (operation === 'GET') {
                                        requestData = {};
                                    }
                                    console.info('Success');

                                    if (angular.isFunction(
                                            callback)) {
                                        callback(data);
                                    }

                                },
                                function(resp) {
                                    var errorMsg = '';
                                    if (resp.data && resp.data
                                        .errors && resp.data
                                        .errors.error &&
                                        resp.data.errors.error
                                        .length) {
                                        errorMsg = ': ' +
                                            resp.data.errors
                                            .error.map(
                                                function(e) {
                                                    return e[
                                                        'error-message'
                                                    ];
                                                }).join(
                                                ', ');
                                    }

                                    errorCallback(scope, scope.selSubApi.node.label, errorMsg);

                                    if (operation === 'GET') {
                                        requestData = {};
                                    }

                                    console.info(
                                        'error sending request to',
                                        scope.selSubApi
                                        .buildApiRequestString(),
                                        'reqString',
                                        reqString,
                                        'got', resp.status,
                                        'data', resp.data
                                    );
                                }
                            );
                    };
                }
                ////////// End snippet originally from yangui.controller.js //////////

            // Function required from the html view files imported from the yangui
            api.getNodeName = function(localeLabel, label) {
                return label;
            };

            ////////// Snippet originally from yangui.controller.js //////////
            api.buildRoot = function(scope) {
                return function() {
                    scope.node.buildRequest(reqBuilder, {});
                };
            };
            ////////// End snippet originally from yangui.controller.js //////////


            var loadingCallback = function(scope, e) {
                scope.status = {
                    show: true,
                    isWorking: true,
                    type: 'success',
                    msg: 'LOADING_NODE',
                    rawMsg: e || ''
                };
            };

            var errorLoadingCallback = function(scope, e) {
                scope.status = {
                    show: true,
                    isWorking: false,
                    type: 'danger',
                    msg: 'LOADING_ERROR',
                    rawMsg: e || ''
                };
            };

            var successloadingCallback = function(scope, e) {
                scope.status = {
                    show: true,
                    isWorking: false,
                    type: 'success',
                    msg: 'LOADING_SUCCESS',
                    rawMsg: e || ''
                };

                setTimeout(function() {
                    scope.status.show = false;
                }, 2000);
            };

            var errorCallback = function(scope, type, e) {
                var errortype = LispuiUtils.getLocale(type)
                    .concat('_ERROR');
                scope.status = {
                    show: true,
                    isWorking: false,
                    type: 'danger',
                    msg: errortype,
                    rawMsg: e || ''
                };
            };

            var successCallback = function(scope, type, e) {
                var errortype = LispuiUtils.getLocale(type)
                    .concat('_SUCCESS');
                scope.status = {
                    show: true,
                    isWorking: false,
                    type: 'success',
                    msg: errortype,
                    rawMsg: e || ''
                };
            };

            return api;

        }
    ]);

    lispui.register.factory('LispuiRestangular', function(Restangular,
        ENV) {
        return Restangular.withConfig(function(
            RestangularConfig) {
            RestangularConfig.setBaseUrl(ENV.getBaseURL(
                "MD_SAL"));
        });
    });

    lispui.register.factory('LispuiDashboardSvc', ['LispuiNodeFormSvc', 'LispuiRestangular', 'LispuiUtils',
        function(LispuiNodeFormSvc, LispuiRestangular, LispuiUtils) {
            var api = {};

            api.getAll = function() {
                return LispuiRestangular.one('restconf').one(
                    'config').one(
                    'odl-mappingservice:mapping-database');
            };

            api.postDeleteKey = function() {
                return LispuiRestangular.one('restconf').one(
                    'operations').one(
                    'odl-mappingservice:remove-key');
            }

            api.postDeleteMapping = function() {
                return LispuiRestangular.one('restconf').one(
                    'operations').one(
                    'odl-mappingservice:remove-mapping');
            }

            api.expandSingleRow = function(element, data, op) {
                temp = element[op];
                for (k of data) {
                    k.detailHide = true;
                    k.deleteHide = true;
                }
                element[op] = !temp;
            };

            api.getOriginalKeys = function() {
                return api.getAll().get().then(function(
                    data) {
                    var database = [];
                    for (vni of data['mapping-database']['virtual-network-identifier']) {
                        if (vni['authentication-key'] != null) {
                            for (key of vni['authentication-key']) {
                                console.log('vni', vni.vni)
                                key.vni = vni.vni;
                                database.push(key);
                            }
                        }
                    }
                    console.info('database,', database);
                    return database;
                });
            };

            api.getOriginalMappings = function() {
                return api.getAll().get().then(function(
                    data) {
                    var database = [];
                    console.info('data:', data);
                    for (vni of data[
                            'mapping-database'][
                            'virtual-network-identifier'
                        ]) {
                        if (vni.mapping != null) {
                            for (mapping of vni.mapping) {
                                mapping.vni = vni.vni;
                                database.push(mapping);
                            }
                        }
                    }
                    console.info('database:', database);
                    return database;
                });
            };

            api.getKeys = function() {
                return api.getOriginalKeys().then(function(
                    database) {
                    var data = []
                    console.info('database:',
                        database);
                    for (key of database) {
                        key.data = LispuiUtils.getPrettyString(JSON.stringify(key));
                        key.detailHide = true;
                        key.deleteHide = true;
                        key.url = key['eid-uri'].replace(
                            '/', '%2f');
                        data.push(key);
                    }
                    console.info('keys:', data);
                    return data;
                });
            };

            api.getMappings = function() {
                return api.getOriginalMappings().then(
                    function(database) {
                        var data = [];
                        for (mapping of database) {
                            mapping.data = LispuiUtils.getPrettyString(JSON.stringify(mapping));
                            console.log(mapping.data);
                            mapping.detailHide = true;
                            mapping.deleteHide = true;
                            mapping.url = mapping['eid-uri'].replace('/', '%2f');
                            var numLocators = 0;
                            var locatorString = '';
                            var mainLocatorRecord = null;
                            var mappingRecord = mapping['mapping-record'];
                            console.info(mappingRecord);
                            if (mappingRecord.LocatorRecord) {
                                numLocators = mappingRecord.LocatorRecord
                                    .length;
                                // Take the most important Locator
                                mainLocatorRecord =
                                    mappingRecord.LocatorRecord[
                                        0];
                                for (i = 1; i <
                                    numLocators; i++) {
                                    if (mappingRecord.LocatorRecord[
                                            i].priority <
                                        mainLocatorRecord
                                        .priority ||
                                        (mappingRecord.LocatorRecord[
                                                i].priority ==
                                            mainLocatorRecord
                                            .priority &&
                                            mappingRecord.LocatorRecord[
                                                i].weight >
                                            mainLocatorRecord
                                            .weight))
                                        mainLocatorRecord =
                                        mappingRecord.LocatorRecord[
                                            i];
                                }
                                locatorString +=
                                    LispuiUtils.renderLispAddress(
                                        mainLocatorRecord
                                        .rloc
                                    );
                                if (numLocators > 1) {
                                    numLocators--;
                                    locatorString +=
                                        ' (+' +
                                        numLocators +
                                        ')';
                                }

                                // FLAGS
                                var flags = '';
                                var previous = false;
                                if (mainLocatorRecord.localLocator) {
                                    flags += 'Local';
                                    previous = true;
                                }
                                if (mainLocatorRecord.rlocProbed) {
                                    flags += previous ?
                                        ' | Probed' :
                                        'Probed';
                                    previous = true;
                                }
                                if (mainLocatorRecord.routed) {
                                    flags += previous ?
                                        ' | Up' : 'Up';
                                    previous = true;
                                }

                                // TTL
                                var ttl = '';
                                ttl +=
                                    mainLocatorRecord.priority
                                    .toString() + '/' +
                                    mainLocatorRecord.weight
                                    .toString();
                                ttl += '/' +
                                    mainLocatorRecord.multicastPriority
                                    .toString() + '/' +
                                    mainLocatorRecord.multicastWeight
                                    .toString();
                                mapping.ttl = ttl;
                            } else {
                                locatorString +=
                                    mapping.action;
                            }
                            mapping.locatorString = locatorString;
                            mapping.flags = flags;

                            data.push(mapping);
                        }
                        console.info('mappings:', data);
                        return data;
                    });
            }

            api.getDeleteKey = function(key) {
                var postKey = {
                    "input": {}
                };
                /*
                if (key.vni == '0' || Object.keys(key.LispAddressContainer)[0] == 'LcafSegmentAddr') {
                    postKey.input.LispAddressContainer = key.LispAddressContainer;
                } else {
                    // In case the IID is not 0 and the LispAddressContainer is not coded as LCAF, code it as LcafSegmentAddr
                    postKey.input.LispAddressContainer = {
                        "LcafSegmentAddr": {
                            "afi": 16387,
                            "lcafType": 2,
                            "instanceId": parseInt(key.vni),
                            "iidMaskLength": 32,
                            "Address": key.LispAddressContainer
                        }
                    }
                }
                postKey.input['mask-length'] = key['mask-length'];
                console.log('postKey', postKey);
                */
                postKey.input.eid = key.eid;
                return postKey;
            }

            api.getDeleteMapping = function(mapping) {
                var postMapping = {
                    "input": {}
                };
                /*
                if (mapping.vni == '0' || Object.keys(mapping.LispAddressContainer)[0] == 'LcafSegmentAddr') {
                    postMapping.input.LispAddressContainer = mapping.LispAddressContainer;
                } else {
                    // In case the IID is not 0 and the LispAddressContainer is not coded as LCAF, code it as LcafSegmentAddr
                    postMapping.input.LispAddressContainer = {
                        "LcafSegmentAddr": {
                            "afi": 16387,
                            "lcafType": 2,
                            "instanceId": parseInt(mapping.vni),
                            "iidMaskLength": 32,
                            "Address": mapping.LispAddressContainer
                        }
                    }
                }
                postMapping.input['mask-length'] = mapping['maskLength'];
                console.log('postMapping', postMapping);
                */
                postMapping.input.eid = mapping['mapping-record'].eid;
                return postMapping;
            }

            return api;
        }
    ]);

    lispui.register.factory('LispuiTopologySvc', ['LispuiDashboardSvc', 'LispuiUtils',
        function (LispuiDashboardSvc, LispuiUtils) {
            api = {};

            api.getIID = function () {
                return LispuiDashboardSvc.getAll().get().then(function(data) {
                    var iids = [];
                    for (iid of data['mapping-database']['instance-id']) {
                        if (iid.mapping != null)
                            iids.push(parseInt(iid.iid));
                    }
                    // Sorting the InstanceID's
                    iids.sort(function(a,b) { return a-b;});
                    return iids;
                });
            };

            api.getMapping = function (iid) {
                return LispuiDashboardSvc.getAll().get().then(function (data) {
                    var mappings = [];
                    for (iidData of data['mapping-database']['instance-id']) {
                        if (iidData.iid == iid && iidData.mapping != null)
                            mappings = iidData.mapping;
                    }
                    return mappings;
                });
            };

            api.getTopologyData = function (iid) {
                return api.getMapping(iid).then(function (mapping) {
                    console.log('iid:', iid);
                    console.log('mapping:', mapping);
                    var eidNodes = [];
                        rlocNodes = [];
                        links = [];
                        groups = [];
                        nodes = [];
                        index = 0;
                    for (m of mapping) {
                        console.log('map:', m);
                        var map = {};
                        map.id = index;
                        map.name = m.eid;
                        map.address = m.eid;
                        var isMultipleHosts = api.isMultipleHosts(m);
                        map.iconType = (isMultipleHosts) ? 'hostgroup' : 'host';
                        index++;
                        eidNodes.push(map);
                        nodes.push(map);

                        // Store the nodes to then link them
                        var n = [map.id];

                        for (rloc of m.LocatorRecord) {
                            var loc = {};
                            loc.id = index;
                            loc.name = rloc.name;
                            loc.address = LispuiUtils.getAddress(rloc.LispAddressContainer);
                            loc.iconType = 'router';

                            //check if the rloc is stored previosly
                            var id = api.rlocIsStored(rlocNodes, loc)
                            if (id < 0) {
                                rlocNodes.push(loc);
                                nodes.push(loc);
                                n.push(loc.id);
                                index++;
                            } else {
                                n.push(id);
                            }                     
                        }
                        for (i of n) {
                            var link = api.getLink(map.id, i);
                            links.push(link);
                        }

                        console.log('nodes:', n);
                        if (m['site-id'] != null) {
                            if (api.isSiteId(groups, m['site-id'][0])) {
                                for (i=0; i<groups.length; i++) {
                                    if (groups[i].name == m['site-id'][0])
                                        groups[i].nodes.push(n);
                                }
                            } else {
                                nodeSet = {
                                    iconType: 'groupm', 
                                    type: 'NodeSet', 
                                    nodes: n, 
                                    root: n[n.length-1],
                                    name: m['site-id'][0]
                                };
                                groups.push(nodeSet);
                            }
                        }
                    }
                    console.log('eids:', eidNodes);
                    console.log('rlocs:', rlocNodes);
                    console.log('links1:', links);
                    var cloud = {};
                    cloud.id = index;
                    cloud.name = 'Network';
                    cloud.address = 'Network';
                    cloud.iconType = 'cloud';
                    nodes.push(cloud);
                    for (rloc of rlocNodes) {
                        links.push(api.getLink(cloud.id, rloc.id));
                    }
                    console.log('cloud:', cloud);
                    console.log('links:', links);
                    console.log('groups:', groups);
                    for (item of groups) {
                        item.id = index;
                        index++;
                    }

                    return {
                        nodes: nodes,
                        links: links,
                        nodeSet: groups
                    };
                });
            };

            // Search at all rlocNodes list if the locator loc is in there
            api.rlocIsStored = function (rlocNodes, loc) {
                var id = -1;
                for (l of rlocNodes) {
                    if (l.address == loc.address)
                        id = l.id;
                }
                console.log('id:', id);
                return id;
            }

            api.getLink = function (source, target) {
                var link = {"source": source, "target": target};
                console.log('link', link);
                return link;
            };

            api.isSiteId = function (groups, siteId) {
                var isSiteId = false;
                for (item of groups) {
                    if (item.name == siteId)
                        isSiteId = true;
                }
                return isSiteId;
            };

            api.isMultipleHosts = function(map) {
                var isMultipleHosts = false;
                if (Object.keys(map.LispAddressContainer)[0] == "Ipv4Address" && map.maskLength < 32)
                    isMultipleHosts = true;
                else if (Object.keys(map.LispAddressContainer)[0] == "Ipv6Address" && map.maskLength < 128)
                    isMultipleHosts = true;
                return isMultipleHosts;
            }

            return api;
        }
    ]);

    lispui.register.factory('LispuiUtils', ['$filter',
        function($filter) {
            var api = {};

            api.getLocale = function(label) {
                locale = '';

                locale = label == 'add-key' ? 'ADD_KEY' :
                    locale;
                locale = label == 'get-key' ? 'GET_KEY' :
                    locale;
                locale = label == 'update-key' ? 'EDIT_KEY' :
                    locale;
                locale = label == 'add-mapping' ?
                    'ADD_MAPPING' : locale;
                locale = label == 'get-mapping' ?
                    'GET_MAPPING' : locale;
                locale = label == 'update-mapping' ?
                    'EDIT_MAPPING' : locale;

                return locale;

            };

            api.getPrettyString = function(input) {
                output = '<p>';
                length = input.length;
                indx = 0;

                for (i = 0; i < length; i++) {
                    if (input[i] == '{' || input[i] == '[') {
                        output = output.concat(input[i]).concat('<br>');
                        indx++;
                        for (j = 0; j < indx; j++)
                            output = output.concat('&nbsp;&nbsp;&nbsp;&nbsp;');
                    } else if (input[i] == '}' || input[i] == ']') {
                        output = output.concat('<br>');
                        indx--;
                        for (j = 0; j < indx; j++)
                            output = output.concat('&nbsp;&nbsp;&nbsp;&nbsp;');
                        output = output.concat(input[i]);
                    } else if (input[i] == ',') {
                        output = output.concat(',<br>');
                        for (j = 0; j < indx; j++)
                            output = output.concat('&nbsp;&nbsp;&nbsp;&nbsp;');
                    } else {
                        output = output.concat(input[i]);
                        if (input[i] == ':')
                            output = output.concat(' ');
                    }

                }
                output = output.concat('</p>');
                // Return a trusted HTML for ng-bind-html
                return $sce.trustAsHtml(output);
            }

            api.renderLispAddress = function(lispAddress) {
                var string = '';

                if (!lispAddress)
                    return string;

                var addressType = lispAddress['address-type'];
                addressType = addressType.replace(/.*\:/, "");
                addressType = addressType.replace(/-afi$/, "");
                addressType = addressType.replace(/-lcaf$/, "");

                console.info(lispAddress);
                console.info(addressType);

                if (addressType == "no-address") {
                    string += 'no:No Address Present';
                } else if (addressType == "ipv4" || addressType == "ipv4-prefix") {
                    string += 'ipv4:';
                    string += lispAddress[addressType];
                } else if (addressType == "ipv6" || addressType == "ipv6-prefix") {
                    string += 'ipv6:';
                    string += lispAddress[addressType];
                } else if (addressType == "mac") {
                    string += 'mac:';
                    string += lispAddress[addressType];
                } else if (addressType == "distinguished-name") {
                    string += 'dn:';
                    string += lispAddress[addressType];
                } else if (addressType == "as-number") {
                    string += 'as:AS';
                    string += lispAddress[addressType];
                } else if (addressType == "afi-list") {
                    string += 'list:{';
                    var addresses = lispAddress[addressType].address;
                    var first = true;
                    for (add of addresses) {
                        string += (first) ? '' : ',';
                        first = false;
                        delete add.name;
                        string += add;
                    }
                    string += '}';
                } else if (addressType == "instance-id") {
                    string += '[' + lispAddress[addressType].iid + '] ';
                    string += lispAddress[addressType].address;
                } else if (addressType == "application-data") {
                    string += 'appdata:'
                    console.log(lispAddress[addressType].address);
                    string += lispAddress[addressType].address;
                    string += '!' + lispAddress[addressType].ipTos;
                    string += '!' + lispAddress[addressType].protocol;
                    string += '!' + lispAddress[addressType].localPortLow;
                    string += '-' + lispAddress[addressType].localPortHigh;
                    string += '!' + lispAddress[addressType].remotePortLow;
                    string += '-' + lispAddress[addressType].remotePortHigh;
                } else if (addressType == "explicit-locator-path") {
                    string += 'elp:';
                    string += '{';
                    var hops = lispAddress[addressType].hop;
                    first = true;
                    for (hop of hops) {
                        string += (first) ? '' : '→';
                        first = false;
                        string += hop.hop.address;
                    }
                    string += '}';
                } else if (addressType == "source-dest-key") {
                    string += 'srcdst:';
                    string += lispAddress[addressType].source;
                    string += '|';
                    string += lispAddress[addressType].dest;
                } else if (addressType == "key-value-address") {
                    string += lispAddress[addressType].key;
                    string += '=>';
                    string += lispAddress[addressType].value;
                }

                return string;
            }

            return api;
        }
    ]);

});
