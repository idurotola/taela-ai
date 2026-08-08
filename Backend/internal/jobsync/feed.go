// Package jobsync ingests job listings from an external RSS feed into the
// local job catalog, on a schedule, instead of the API fetching the feed
// live on every request.
package jobsync

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/encoding/htmlindex"
)

// FeedURL is MyJobMag's public RSS feed of recent listings.
const FeedURL = "https://www.myjobmag.com/jobsxml.xml"

// SourceName tags every Job ingested from FeedURL, so a sync run can find
// and expire only its own rows without touching jobs from other sources.
const SourceName = "myjobmag"

type rssFeed struct {
	Channel struct {
		Items []rssItem `xml:"item"`
	} `xml:"channel"`
}

type rssItem struct {
	Title       string `xml:"title"`
	Industry    string `xml:"industry"`
	Link        string `xml:"link"`
	GUID        string `xml:"guid"`
	PubDate     string `xml:"pubDate"`
	Description string `xml:"description"`
}

func fetchFeed(url string) ([]rssItem, error) {
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("fetching job feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("job feed returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading job feed: %w", err)
	}

	decoder := xml.NewDecoder(bytes.NewReader(body))
	decoder.CharsetReader = charsetReader

	var feed rssFeed
	if err := decoder.Decode(&feed); err != nil {
		return nil, fmt.Errorf("parsing job feed: %w", err)
	}

	return feed.Channel.Items, nil
}

// charsetReader lets encoding/xml decode feeds declared in a legacy charset
// (this feed uses iso-8859-1) instead of failing outright — encoding/xml
// only understands UTF-8 natively.
func charsetReader(charset string, input io.Reader) (io.Reader, error) {
	enc, err := htmlindex.Get(strings.ToLower(charset))
	if err != nil {
		// Unrecognized label — most legacy feeds that hit this are Latin-1,
		// so fall back to it rather than failing the whole sync.
		enc = charmap.ISO8859_1
	}
	return enc.NewDecoder().Reader(input), nil
}
