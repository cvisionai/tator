export class CollectionSlideCardData extends HTMLElement {
    constructor() {
        super();


    }

    init(modelData) {
        this._modelData = modelData;
        this.localizationTypes = this._modelData.getStoredLocalizationTypes();
        this.mediaTypes = this._modelData.getStoredMediaTypes();
        this.projectId = this._modelData.getProjectId();
    }

    async makeCardList({ type, id }) {
        // 2 -- slideCard list will be the _states array with a "cards" attribute added
        this.slideCardList = {};
        this.slideCardList.slideCards = [];

        if (type == "Localization") {
            var localization = await this._modelData.getLocalization(id);
            var media = await this._modelData.getMedia(localization.media);
            await this.getSlideCardList(localization, media);
            return this.slideCardList.slideCards;
        } else if (type == "Media") {
            this.media = await this._modelData.getMedia(id)
            await this.getSlideMediaCardList(this.media);
            return this.slideCardList.slideCards;
        }


    }

    getSlideMediaCardList(media) {
        return new Promise((resolve, reject) => {
            let m = media;
            let id = m.id;
            let mediaLink = this._modelData.generateMediaLink(m.id);
            let entityType = this.findMediaMetaDetails(m.type)
            let attributes = m.attributes;
            let created = new Date(m.created_datetime);
            let modified = new Date(m.modified_datetime);
            let mediaId = id;
            let image = m.media_files.thumbnail[0].path;
            let thumbnail = m.media_files.thumbnail[0].path;

            let mediaInfo = {
                id,
                entityType,
                attributes,
                media: m,
            }

            let slideCard = {
                id,
                localization: null,
                entityType,
                mediaId,
                mediaInfo,
                mediaLink,
                attributes,
                created,
                modified,
                image,
                thumbnail
            };

            this.slideCardList.slideCards.push(slideCard);
            resolve();
        });
    }

    getSlideCardList(localization, media) {
        return new Promise((resolve, reject) => {
            let l = localization;
            let id = l.id;
            let mediaLink = this._modelData.generateMediaLink(l.media, l.frame, l.id, l.version);
            let entityType = this.findMetaDetails(l.type);
            let attributes = l.attributes;
            let created = new Date(l.created_datetime);
            let modified = new Date(l.modified_datetime);
            let mediaId = l.media;

            let mediaInfo = {
                id: mediaId,
                entityType: this.findMediaMetaDetails(media.type),
                attributes: media.attributes,
                media: media,
            }

            let slideCard = {
                id,
                localization: l,
                entityType,
                mediaId,
                mediaInfo,
                mediaLink,
                attributes,
                created,
                modified
            };

            this.slideCardList.slideCards.push(slideCard);
            resolve();

            this._modelData.getLocalizationGraphic(l.id).then((image) => {
                this.dispatchEvent(new CustomEvent("setSlideCardImage", {
                    composed: true,
                    detail: {
                        id: l.id,
                        image: image
                    }
                }));
            });
        });
    }

    findMetaDetails(id) {
        for (let lt of this.localizationTypes) {
            if (lt.id == id) {
                return lt;
            }
        }
    }

    findMediaMetaDetails(id) {
        for (let mediaType of this.mediaTypes) {
            if (mediaType.id == id) {
                return mediaType;
            }
        }
    }

}

customElements.define("collection-slide-card-data", CollectionSlideCardData);