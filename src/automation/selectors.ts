/**
 * CSS selectors for Instagram UI elements
 * These selectors need to be regularly maintained as Instagram changes its UI
 */
export const InstagramSelectors = {
  // Login Page
  USERNAME_INPUT: 'input[name="username"]',
  PASSWORD_INPUT: 'input[name="password"]',
  LOGIN_BUTTON: 'button[type="submit"]',
  ACCEPT_COOKIES_BUTTON: 'button[type="button"]._a9_1',
  TWO_FACTOR_INPUT: 'input[name="verificationCode"]',
  TWO_FACTOR_SUBMIT: 'button[type="button"]._acan._acap._acas._aj1-',
  SAVE_LOGIN_INFO: 'button._acan._acap._acas._aj1-',
  NOT_NOW_BUTTON: 'button._a9--._a9_1',
  INCORRECT_PASSWORD: 'p#slfErrorAlert',
  SUSPICIOUS_LOGIN: 'div[role="alert"]',
  ACCOUNT_DISABLED: 'div[role="alert"]',
  
  // Navigation
  PROFILE_ICON: 'span._aa8h',
  HOME_ICON: 'svg[aria-label="Home"]',
  EXPLORE_ICON: 'svg[aria-label="Explore"]',
  ACTIVITY_ICON: 'svg[aria-label="Notifications"]',
  
  // Profile Page
  PROFILE_USERNAME: 'h2._aacl._aacs._aact._aacx._aada',
  PROFILE_FULL_NAME: 'span._aacl._aacs._aact._aacx._aada',
  PROFILE_BIO: 'div._aa_c',
  PROFILE_WEBSITE: 'a._aacl._aacs._aact._aacx._aada',
  PROFILE_STATS: 'ul._aa_7',
  FOLLOWER_COUNT: 'a[href*="followers"] span',
  FOLLOWING_COUNT: 'a[href*="following"] span',
  POST_COUNT: 'span._ac2a span',
  PROFILE_PICTURE: 'img._aa8j',
  VERIFIED_BADGE: 'span[aria-label="Verified"]',
  PRIVATE_ACCOUNT_INDICATOR: 'h2._aacl._aacp._aacw._aacx._aad6._aade',
  FOLLOW_BUTTON: 'button._acan._acap._acas._aj1-',
  UNFOLLOW_BUTTON: 'button._acan._acap._acat._aj1-',
  CONFIRM_UNFOLLOW_BUTTON: 'button._a9--._a9_1',
  
  // Post Creation
  CREATE_POST_BUTTON: 'svg[aria-label="New post"]',
  FILE_INPUT: 'input[type="file"]',
  NEXT_BUTTON: 'button._acan._acap._acas._aj1-',
  CAPTION_INPUT: 'div[aria-label="Write a caption..."] p',
  ADD_LOCATION_BUTTON: 'button[aria-label="Add location"]',
  LOCATION_SEARCH_INPUT: 'input[placeholder="Add location"]',
  LOCATION_RESULT: 'div._aaie',
  SHARE_BUTTON: 'button._acan._acap._acaq._acas._acav._aj1-',
  POST_SUCCESS_INDICATOR: 'div._aa61',
  
  // Post Interaction
  LIKE_BUTTON: 'svg[aria-label="Like"]',
  UNLIKE_BUTTON: 'svg[aria-label="Unlike"]',
  COMMENT_INPUT: 'textarea[placeholder="Add a comment…"]',
  COMMENT_SUBMIT: 'button[type="submit"]',
  
  // Post Content
  POST_ITEMS: 'article div._aagw',
  VIDEO_INDICATOR: 'span[aria-label="Video"]',
  POST_LIKE_COUNT: 'a._aacl._aacs._aact._aacx._aada span',
  POST_COMMENT_COUNT: 'a[href*="comments"]',
  POST_CAPTION: 'span._aacl._aaco._aacu._aacx._aad7._aade',
  POST_TIMESTAMP: 'time._aaqe',
  POST_LOCATION: 'a._aaqm',
  POST_IMAGE: 'div._aagv img',
  POST_HASHTAGS: 'a[href*="/explore/tags/"]',
  
  // Hashtag Page
  HASHTAG_POSTS: 'article._aaq8',
  HASHTAG_POST_ITEMS: 'article._aaq8 div._aabd._aa8k._al3l',
  
  // Story Creation
  CREATE_STORY_BUTTON: 'svg[aria-label="New story"]',
  STORY_FILE_INPUT: 'input[accept="image/jpeg,image/png,image/heic,image/heif,video/mp4,video/quicktime"]',
  STORY_SHARE_BUTTON: 'button[type="button"]._acan._acap._acas._acav._aj1-',
  
  // Direct Messages
  MESSAGE_ICON: 'svg[aria-label="Messenger"]',
  NEW_MESSAGE_BUTTON: 'button[aria-label="New message"]',
  MESSAGE_SEARCH_INPUT: 'input[placeholder="Search..."]',
  MESSAGE_USER_RESULT: 'div._ab8w._ab94._ab97._ab9h._ab9k._ab9p._aba_._abcm',
  MESSAGE_TEXT_AREA: 'div[aria-label="Message"] p',
  MESSAGE_SEND_BUTTON: 'button[type="submit"]',
  
  // Search
  SEARCH_INPUT: 'input[placeholder="Search"]',
  SEARCH_RESULT_USERS: 'div._aacl._aaco._aacw._aacx._aad6._aade',
  
  // Explore Page
  EXPLORE_POSTS: 'article._aaq8 div._aabd._aa8k._al3l',
  
  // Suggestions
  SUGGESTED_USERS: 'div._aaip',
  SUGGESTED_USER_FOLLOW_BUTTON: 'button._acan._acap._acas._aj1-',
  
  // Error Indicators
  ACTION_BLOCKED: 'div[role="dialog"] h3'
};