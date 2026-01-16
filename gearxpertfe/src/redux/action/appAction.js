export const SHOW_HOME_LOADING = "SHOW_HOME_LOADING";
export const HIDE_HOME_LOADING = "HIDE_HOME_LOADING";

export const showHomeLoading = () => {
    return {
        type: SHOW_HOME_LOADING,
    };
};

export const hideHomeLoading = () => {
    return {
        type: HIDE_HOME_LOADING,
    };
};
