import React from "react"
import TwitterLogo from "../assets/twitter-512.png"

// CONSTANTS
const TWITTER_HANDLE = 'nitsuahlabs';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

export default function Footer() {
  
  return (
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={TwitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
  );
};