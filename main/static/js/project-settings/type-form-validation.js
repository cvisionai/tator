class TypeFormValidation{
    constructor(){

    }

    findError(name, val){
        switch(name){
            case "name" : 
                if(this.isRequired(val)){
                    return false;
                } else {
                    return `Name cannot be blank.`;
                }
            case "dtype" : 
                if(this.isRequired(val)){
                    return false;
                } else {
                    return `Data Type is required.`;
                }
            case "default_volume" :
                if(this.numberMax(val, 100)){
                    return false;
                } else {
                    return `${val} is greater than the maximum of 100.`;
                }
            default :
                return false
                
        }
    }

    // Number Max ie. < 100
    numberMax(val, max){
        return val < max;
    }

    // Not empty
    isRequired(val){
        return  (typeof val !== "undefined") && (val !== null) && (val !== "");
    }
}