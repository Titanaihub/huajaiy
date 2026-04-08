const e="huajaiy_member_token";function r(){try{const t=localStorage.getItem(e);if(t&&t.trim())return{Authorization:`Bearer ${t.trim()}`}}catch{}return{}}export{r as m};
