import type {
  HomepageConfigDraft,
  HomepageFrameThree,
  HomepageHorizontalJourney,
  HomepageSpotlightConfig,
} from "../schemas/homepage.js";

export type HomepageAdminResponse = HomepageConfigDraft;

export type PublicHomepageSpotlightSlot = HomepageSpotlightConfig["slots"][number] & {
  project: {
    id: string;
    title: string;
    slug: string;
  };
};

export type PublicHomepageResponse = {
  horizontalJourney: HomepageHorizontalJourney;
  frame3: HomepageFrameThree;
  spotlight: {
    slots: [
      PublicHomepageSpotlightSlot,
      PublicHomepageSpotlightSlot,
      PublicHomepageSpotlightSlot,
      PublicHomepageSpotlightSlot,
    ];
  };
};
