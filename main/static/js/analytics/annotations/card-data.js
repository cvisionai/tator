class AnnotationCardData extends HTMLElement {
    constructor(){
        super();
    }

    init(modelData) {
        this._modelData = modelData;
        this.localizationTypes = this._modelData.getStoredLocalizationTypes();
        this.projectId = this._modelData.getProjectId();
    }

    async makeCardList({filterState, paginationState}) {
        this.cardList = {};
        this.cardList.cards = [];
        this.cardList.filterState = filterState;
        this.cardList.paginationState = paginationState;

        this.cardList.total = await this._modelData.getFilteredLocalizations("count", filterState.conditionsObject);
        this.localizations = await this._modelData.getFilteredLocalizations("objects", filterState.conditionsObject, paginationState.start, paginationState.stop);
        this.mediaTypes = this._modelData.getStoredMediaTypes();
        this.projectId = this._modelData.getProjectId();

        await this.getCardList(this.localizations);
        return this.cardList;
    }

    getCardList(localizations){
        return new Promise((resolve, reject) => {
            var haveCardShells = function () {
                if (counter <= 0) {
                    resolve();
                }
            }

            let counter = localizations.length;
            console.log("Processing " + counter + " localizations in gallery.");

            // Handle the case where we get nothing back
            haveCardShells();

            for(let [i, l] of localizations.entries()){
                let id = l.id;
                let mediaLink = this._modelData.generateMediaLink(l.media, l.frame, l.id);
                let entityType = this.findMetaDetails(l.meta);

                let attributes = l.attributes;
                let created = new Date(l.created_datetime);
                let modified = new Date(l.modified_datetime);
                let mediaId = l.media;

                let position = i + this.cardList.paginationState.start;
                let posText = `${position + 1} of ${this.cardList.total}`;

                let card = {
                    id,
                    localization : l,
                    entityType,
                    mediaId,
                    entityType,
                    mediaLink,
                    attributes,
                    created,
                    modified,
                    posText
                };

                this.cardList.cards.push(card);
                counter--;
                haveCardShells();

                this._modelData.getLocalizationGraphic(l.id).then((image) => {
                    this.dispatchEvent(new CustomEvent("setCardImage", {
                        composed: true,
                        detail: {
                            id: l.id,
                            image: image
                        }
                    }));
                });

                this._modelData.getDataById(l.media, "media").then((media) => {
                    media.entityType = this.findMediaMetaDetails(media.meta);
                    this.dispatchEvent(new CustomEvent("setMedia", {
                        composed: true,
                        detail: {
                            id: l.id,
                            media: media
                        }
                    }))
                });
            }
        });
    }

    findMetaDetails(id){
        for(let lt of this.localizationTypes){
            if(lt.id == id){
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

customElements.define("annotation-card-data", AnnotationCardData);