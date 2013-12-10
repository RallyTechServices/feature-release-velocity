Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',


    // Customer-specific Custom Fields
    _featurePlanEstimate: 'PIPlanEstimate',

    // Global vars
    _releaseCombobox: null,
    _releasePlannedVelocityByProject: {},
    _featurePlanEstimateByProject: {},
    _summaryGrid: null,
    _projectNames: [],

    logger: new Rally.technicalservices.Logger(),
    items: [
        {
            xtype: 'container',
            itemId: 'releaseSelector'
        },
        {
            xtype: 'container',
            itemId: 'gridContainer'
        }
    ],

    _onReleaseChanged: function() {

        var me = this;

        var thisRelease = this._releaseCombobox.getRecord();
        var thisReleaseName = thisRelease.get('Name');
        var thisReleaseObjectID = thisRelease.get('ObjectID');

        var releaseQuery = [
            {
                property: "Name",
                operator: "=",
                value: thisReleaseName
            }
        ];

        var releaseStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'Release',
            autoLoad: true,
            filters: releaseQuery,
            sorters: [
                {
                    property: 'ReleaseDate',
                    direction: 'ASC'
                }
            ],
            fetch: [ 'ObjectID', 'Name', 'PlannedVelocity', 'ReleaseStartDate', 'ReleaseDate', 'Project'],
            context: { projectScopeDown: true },
            listeners: {
                scope: this,
                load: function(store, records) {
                    Ext.Array.each(records, function(release) {
                        var releaseProject = release.get('Project');
                        var releasePlannedVelocity = release.get('PlannedVelocity');
                        var releaseProjName = releaseProject._refObjectName;
                        me._releasePlannedVelocityByProject[releaseProjName] = releasePlannedVelocity;
                    });
                    me._getFeaturePlanEstimates();
                }
            }
        });
    },

    _getFeaturePlanEstimates: function() {

        var me = this;

        var featureStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'PortfolioItem/Feature',
            autoLoad: true,
            sorters: [
                {
                    property: 'FormattedID',
                    direction: 'ASC'
                }
            ],
            fetch: [ 'ObjectID', 'Name', me._featurePlanEstimate, 'Project'],
            context: { projectScopeDown: true },
            listeners: {
                scope: this,
                load: function(store, records) {
                    Ext.Array.each(records, function(feature) {
                        var featureProject = feature.get('Project');
                        var featureProjectName = featureProject._refObjectName;
                        var featurePlanEstimate = feature.get(me._featurePlanEstimate);

                        var testKeyPresent = (featureProjectName in me._featurePlanEstimateByProject);
                        if (!testKeyPresent) {
                            me._featurePlanEstimateByProject[featureProjectName] = 0;
                            me._projectNames.push(featureProjectName);
                        }
                        me._featurePlanEstimateByProject[featureProjectName] += featurePlanEstimate;
                    });
                    console.log(me._featurePlanEstimateByProject);

                    me._createSummaryGrid();
                }
            }
        });
    },

    _createSummaryGrid: function() {

        var me = this;

        if (me._summaryGrid) {
            me._summaryGrid.destroy();
        }

        var gridRecords = [];
        Ext.Array.each(me._projectNames, function(projectName) {
            //Perform custom actions with the data here
            //Calculations, etc.
            gridRecords.push({
                ProjectName: projectName,
                FeaturePlanEstimate: me._featurePlanEstimateByProject[projectName],
                ReleasePlannedVelocity: me._releasePlannedVelocityByProject[projectName]
            });
        });

        console.log(gridRecords);

        me._summaryGrid = Ext.create('Rally.ui.grid.Grid', {
            store: Ext.create('Rally.data.custom.Store', {
                data: gridRecords,
                pageSize: 40
            }),
            columnCfgs: [
                {
                    text: 'Project Name', dataIndex: 'ProjectName', flex: 1
                },
                {
                    text: 'Total Feature Plan Estimate', dataIndex: 'FeaturePlanEstimate'
                },
                {
                    text: 'Release Planned Velocity', dataIndex: 'ReleasePlannedVelocity'
                },
            ]
        });

        this.down('#gridContainer').add(me._summaryGrid);
    },

    launch: function() {
        var me = this;

        this._releaseCombobox = Ext.create('Rally.ui.combobox.ReleaseComboBox', {
            xtype: 'rallyreleasecombobox',
            listeners: {
                scope: this,
                change: function(releasebox, new_value, old_value) {
                    this._onReleaseChanged();
                }
            }
        });

        this.down('#releaseSelector').add(this._releaseCombobox);
    }
});