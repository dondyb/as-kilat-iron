var _              = require('lodash'),
    ghostBookshelf = require('./base'),
    events         = require('../events'),
    baseUtils      = require('./base/utils'),
    Tag,
    Tags;

Tag = ghostBookshelf.Model.extend({

    tableName: 'tags',

    emitChange: function emitChange(event) {
        events.emit('tag' + '.' + event, this);
    },

    initialize: function initialize() {
        ghostBookshelf.Model.prototype.initialize.apply(this, arguments);

        this.on('created', function onCreated(model) {
            model.emitChange('added');
        });
        this.on('updated', function onUpdated(model) {
            model.emitChange('edited');
        });
        this.on('destroyed', function onDestroyed(model) {
            model.emitChange('deleted');
        });
    },

    saving: function saving(newPage, attr, options) {
        /*jshint unused:false*/

        var self = this;

        ghostBookshelf.Model.prototype.saving.apply(this, arguments);

        if (this.hasChanged('slug') || !this.get('slug')) {
            // Pass the new slug through the generator to strip illegal characters, detect duplicates
            return ghostBookshelf.Model.generateSlug(Tag, this.get('slug') || this.get('name'),
                {transacting: options.transacting})
                .then(function then(slug) {
                    self.set({slug: slug});
                });
        }
    },

    posts: function posts() {
        return this.belongsToMany('Post');
    },

    toJSON: function toJSON(options) {
        options = options || {};

        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);

        attrs.parent = attrs.parent || attrs.parent_id;
        delete attrs.parent_id;

        return attrs;
    }
}, {
    setupFilters: function setupFilters() {
        return {};
    },

    findPageDefaultOptions: function findPageDefaultOptions() {
        return {
            where: {}
        };
    },

    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },

    processOptions: function processOptions(itemCollection, options) {
        return options;
    },

    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findPage: ['page', 'limit', 'columns']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    /**
     * ### Find One
     * @overrides ghostBookshelf.Model.findOne
     */
    findOne: function findOne(data, options) {
        options = options || {};

        options = this.filterOptions(options, 'findOne');
        data = this.filterData(data, 'findOne');

        var tag = this.forge(data);

        baseUtils.addPostCount(options, tag);

        // Add related objects
        options.withRelated = _.union(options.withRelated, options.include);

        return tag.fetch(options);
    },

    destroy: function destroy(options) {
        var id = options.id;
        options = this.filterOptions(options, 'destroy');

        return this.forge({id: id}).fetch({withRelated: ['posts']}).then(function destroyTagsAndPost(tag) {
            return tag.related('posts').detach().then(function destroyTags() {
                return tag.destroy(options);
            });
        });
    }
});

Tags = ghostBookshelf.Collection.extend({
    model: Tag
});

module.exports = {
    Tag: ghostBookshelf.model('Tag', Tag),
    Tags: ghostBookshelf.collection('Tags', Tags)
};
