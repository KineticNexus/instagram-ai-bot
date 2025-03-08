/**
 * Selectors for Instagram DOM elements
 * These selectors may need to be updated as Instagram changes its DOM structure
 */
export const InstagramSelectors = {
  // Login selectors
  USERNAME_INPUT: 'input[name="username"]',
  PASSWORD_INPUT: 'input[name="password"]',
  LOGIN_BUTTON: 'button[type="submit"]',
  TWO_FACTOR_INPUT: 'input[name="verificationCode"]',
  TWO_FACTOR_SUBMIT: 'button[type="button"]',
  SAVE_LOGIN_INFO: 'div[class*="_ab8w _ab94 _ab97 _ab9f _ab9k _ab9p _abcm"]',
  NOT_NOW_BUTTON: 'button._acan._acap._acas._aj1-',
  ACCEPT_COOKIES_BUTTON: 'button._a9--._a9_1',

  // Profile selectors
  PROFILE_ICON: 'div._aa8h',
  PROFILE_USERNAME: 'h2._aacl._aacs._aact._aacx._aada',
  PROFILE_FULL_NAME: 'span._aacl._aacs._aact._aacx._aad7._aade',
  PROFILE_BIO: 'div._aa_c',
  PROFILE_WEBSITE: 'a._acan._acap._acas',
  FOLLOWER_COUNT: 'a[href*="followers"] span._aacl._aacp._aacu._aacx._aad6._aade',
  FOLLOWING_COUNT: 'a[href*="following"] span._aacl._aacp._aacu._aacx._aad6._aade',
  POST_COUNT: 'span._aacl._aacp._aacu._aacx._aad6._aade',
  VERIFIED_BADGE: 'span[aria-label="Verified"]',
  PRIVATE_ACCOUNT_INDICATOR: 'div._aa_q',

  // Post creation selectors
  CREATE_POST_BUTTON: 'svg[aria-label="New post"]',
  FILE_INPUT: 'input[type="file"]',
  NEXT_BUTTON: 'button._acan._acap._acas._aj1-',
  CAPTION_INPUT: 'div[aria-label="Write a caption..."]',
  ADD_LOCATION_BUTTON: 'button:has-text("Add location")',
  LOCATION_SEARCH_INPUT: 'input[placeholder="Add location"]',
  LOCATION_RESULT: 'div._abm4:first-child',
  SHARE_BUTTON: 'button:has-text("Share")',
  POST_SUCCESS_INDICATOR: 'div._aa6b',

  // Post interaction selectors
  LIKE_BUTTON: 'span._aamw svg[aria-label="Like"]',
  UNLIKE_BUTTON: 'span._aamw svg[aria-label="Unlike"]',
  COMMENT_INPUT: 'textarea[aria-label="Add a comment…"]',
  COMMENT_SUBMIT: 'div._akhn button',
  FOLLOW_BUTTON: 'button:has-text("Follow")',
  UNFOLLOW_BUTTON: 'button._acan._acap._acat._aj1-',
  CONFIRM_UNFOLLOW_BUTTON: 'button:has-text("Unfollow")',

  // Post listing selectors
  POST_ITEMS: 'article._aabd._aa8k._al3l',
  POST_CAPTION: 'div._a9zs',
  POST_HASHTAGS: 'a[href*="explore/tags"]',
  POST_LIKE_COUNT: 'span._aacl._aacp._aacw._aacx._aada._aade',
  POST_COMMENT_COUNT: 'div._ae2s._ae3v._ae3w span._aacl._aacp._aacu._aacx._aad6._aade',
  POST_TIMESTAMP: 'time._aaqe',
  POST_IMAGE: 'img._aagt',
  VIDEO_INDICATOR: 'span.videoSpritePlayButton'
};