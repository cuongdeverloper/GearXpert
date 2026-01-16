export const SHOW_HOME_LOADING = "SHOW_HOME_LOADING";
export const HIDE_HOME_LOADING = "HIDE_HOME_LOADING";
export const SHOW_ADMIN_LOADING = "SHOW_ADMIN_LOADING";
export const HIDE_ADMIN_LOADING = "HIDE_ADMIN_LOADING";

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

export const showAdminLoading = () => {
    return {
        type: SHOW_ADMIN_LOADING,
    };
};

export const hideAdminLoading = () => {
    return {
        type: HIDE_ADMIN_LOADING,
    };
};
