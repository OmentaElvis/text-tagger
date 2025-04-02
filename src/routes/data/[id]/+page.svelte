<script lang="ts">
  import { LoaderCircle, X, Plus } from "lucide-svelte";
  import { fly } from "svelte/transition";
  import { onDestroy, onMount } from "svelte";

  interface Prediction {
    sentence: string;
    start_index: number;
    end_index: number;
    predicted_clause: string;
    probabilities: number[];
    added: boolean,
  }

  export let data;
  let tags: {
    name: string;
    color: string;
    description: string;
    keywords: string[];
  }[] = data.tags;
  let currentTab = "highlights";
  let auto: null | Prediction[] = null;

  let loadingAutoTags = false;
  let threshold_value = 0.5;

  let selectedTagIndex = 0;
  let documentContent: string | null;
  // let unsubscribe;
  let currentDocName = "";
  let highlightedContent = "";

  // Array to store information about highlights
  let highlights: Record<
    string,
    { color: string; startOffset: number; endOffset: number; text: string }[]
  > = {};
  $: {
    highlights = data.json || {};
  }
  let content = data.text;
  let highlightingKeywords = false;

  function updateHighlightedContent() {
    // Start with the original text
    let updatedContent = documentContent || data.text;

    // Sort highlights to ensure proper layering
    const allHighlights: { tagName: string; text: string; color: string }[] =
      [];

    // Collect all highlights with their tag info
    Object.entries(highlights).forEach(([tagName, items]) => {
      const tag = tags.find((t) => t.name === tagName);
      if (tag && items.length > 0) {
        items.forEach((item) => {
          allHighlights.push({
            ...item,
            tagName,
            color: tag.color,
          });
        });
      }
    });

    // If there are highlights to process
    if (allHighlights.length > 0) {
      // Find each highlight text in the content and wrap it
      allHighlights.forEach((highlight) => {
        const escapedText = escapeRegExp(highlight.text);
        const regex = new RegExp(`(${escapedText})`, "g");

        updatedContent = updatedContent.replace(
          regex,
          `<span class="highlight" data-tag="${highlight.tagName}" style="background-color: ${highlight.color};">$1</span>`,
        );
      });

      highlightedContent = updatedContent;
      // content = updatedContent;
    } else {
      // Reset to original content if no highlights
      highlightedContent = data.text;
      // content = data.text;
    }
  }

  // Function to apply the highlight on the current selection
  function applyTag() {
    const selection = window.getSelection();
    if (!selection) return;
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    // Only proceed if some text is actually selected
    if (range.collapsed) return;

    const tag = tags[selectedTagIndex];
    const selectedText = range.toString();

    // Store the highlight details
    let highlight = highlights[tag.name] || [];
    highlight = [
      ...highlight,
      {
        text: selectedText,
        color: tag.color,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
      },
    ];
    highlights[tag.name] = highlight;

    // Clear the selection after highlighting
    selection.removeAllRanges();

    // Update highlighted content
    updateHighlightedContent();
  }

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  // This function highlights all occurrences of the provided tag's keywords.
  function highlightOccurrences() {
    let tag = tags[selectedTagIndex];
    if (highlightingKeywords) {
      resetHighlighting();
      return;
    }
    highlightingKeywords = true;
    // Always start with the original content to avoid stacking highlights.
    let updatedContent = data.text;
    tag.keywords.forEach((keyword: string) => {
      const escapedKeyword = escapeRegExp(keyword);
      // Create a case-insensitive global regex for the keyword.
      const regex = new RegExp(`(${escapedKeyword})`, "gi");
      updatedContent = updatedContent.replace(
        regex,
        `<span style="background-color: ${tag.color};">$1</span>`,
      );
    });
    content = updatedContent;
  }

  // Optional: reset the highlighting to show the original text.
  function resetHighlighting() {
    content = highlightedContent;
    highlightingKeywords = false;
  }
  let saving = false;
  async function save() {
    saving = true;
    let res = await fetch("", {
      body: JSON.stringify(highlights),
      method: "POST",
    });
    if (res.ok) {
    } else {
    }
    saving = false;
  }
  function removeItem(key: string, index: number) {
    if (highlights[key]) {
      highlights[key].splice(index, 1);
      highlights[key] = [...highlights[key]];

      // If this was the last item for this tag, check if we need to remove the key
      if (highlights[key].length === 0) {
        delete highlights[key];
        highlights = { ...highlights }; // Trigger reactivity
      }

      // Update the highlighted content
      updateHighlightedContent();
    }
  }
  function changeTab(name: string) {
    currentTab = name;
  }
  // Modify your performAutoTag function to sort results by confidence
  async function performAutoTag() {
    loadingAutoTags = true;
    try {
      let req = await fetch(`/api/auto/${data.name}`);
      if (!req.ok) {
        loadingAutoTags = false;
        return;
      }

      let json: { results: Prediction[] } = await req.json();

      // Sort the results by highest confidence first
      json.results.sort((a, b) => {
        const confidenceA = Math.max(...a.probabilities);
        const confidenceB = Math.max(...b.probabilities);
        return confidenceB - confidenceA; // Descending order
      });

      auto = json.results;
    } catch (err) {
      console.log(err);
    }
    loadingAutoTags = false;
  }
  function getTagColor(name: string) {
    let tag = tags.find((t) => t.name == name);
    if (tag) {
      return tag.color;
    }
    return null;
  }
  // Add this function to visualize predictions based on confidence
  function highlightPredictions() {
    // Start with original content
    let updatedContent = data.text;
    if (highlightingKeywords) {
      resetHighlighting();
      return;
    }

    if (!auto) {
      return;
    }

    // Sort auto predictions by confidence for proper layering (highest confidence last)
    const sortedPredictions = [...auto].sort((a, b) => {
      return Math.max(...a.probabilities) - Math.max(...b.probabilities);
    });

    sortedPredictions.forEach((prediction) => {
      const confidence = Math.max(...prediction.probabilities);
      const tag = tags.find((t) => t.name === prediction.predicted_clause);

      if (tag) {
        // Skip low confidence predictions (threshold configurable)
        if (confidence < 0.5) return;

        // Escape the sentence for regex
        const escapedSentence = escapeRegExp(prediction.sentence);

        // Create regex to find this exact sentence
        const regex = new RegExp(`(${escapedSentence})`, "g");

        // Calculate opacity based on confidence (0.3 to 1.0 range)
        const opacity = 0.3 + confidence * 0.7;

        // Add data attributes for filtering later
        updatedContent = updatedContent.replace(
          regex,
          `<span 
          style="background-color: ${tag.color}; opacity: ${opacity};" 
          data-confidence="${confidence}"
          data-tag="${tag.name}"
          class="auto-highlight"
        >$1</span>`,
        );
      }
    });

    content = updatedContent;
    highlightingKeywords = true;
  }
  function filterByConfidence(threshold: string) {
    threshold_value = Number(threshold);
    const highlights: NodeListOf<HTMLSpanElement> =
      document.querySelectorAll(".auto-highlight");
    highlights.forEach((highlight) => {
      const confidence = parseFloat(highlight.dataset.confidence || "0");
      if (confidence < threshold_value) {
        highlight.style.display = "none";
      } else {
        highlight.style.display = "inline";
      }
    });
  }

  function filterByTag(tagName: string) {
    const highlights: NodeListOf<HTMLSpanElement> = document.querySelectorAll(".auto-highlight");
    highlights.forEach((highlight) => {
      if (tagName === "all" || highlight.dataset.tag === tagName) {
        highlight.style.display = "inline";
      } else {
        highlight.style.display = "none";
      }
    });
  }
  function addAutoHighlight(prediction: Prediction, index: number) {
    if (!auto) return;
    const tagName = prediction.predicted_clause;
    const tag = tags.find((t) => t.name === tagName);

    if (tag) {
      // Check if this exact text is already highlighted
      const existingHighlights = highlights[tagName] || [];
      const alreadyExists = existingHighlights.some(
        (h) => h.text === prediction.sentence,
      );

      if (!alreadyExists) {
        let highlight = [...existingHighlights];
        highlight.push({
          text: prediction.sentence,
          color: tag.color,
          // confidence: Math.max(...prediction.probabilities),
          startOffset: 0,
          endOffset: 0,
        });

        highlights[tagName] = highlight;
        auto[index].added = true;

        // Update the highlighted content
        updateHighlightedContent();
      }
    }
  }
  function resetState() {
    // Reset all the state variables
    highlights = {};
    content = data.text;
    highlightingKeywords = false;
    auto = null;
    loadingAutoTags = false;
    currentTab = "highlights";

    // Load the new document data
    documentContent = data.text;

    // If there are highlights in the new document data, load them
    if (data.json && Object.keys(data.json).length > 0) {
      highlights = data.json;
      updateHighlightedContent();
    }
  }

  $: {
    if (content && highlights) {
      updateHighlightedContent();
    }
  }

  // Initialize on mount
  onMount(() => {
    documentContent = data.text;
    if (Object.keys(highlights).length > 0) {
      updateHighlightedContent();
    }

    // Set the initial document name
    currentDocName = data.name;

    // Listen for route/navigation changes
    // This depends on your router, but here's a generic approach
    const checkForDocumentChanges = () => {
      // If the document name in the URL or data has changed
      if (data.name !== currentDocName) {
        // Document has changed, reset state
        resetState();
        currentDocName = data.name;
      }
    };

    // Set up interval to check for navigation changes
    // This is a fallback if your router doesn't provide events
    const intervalId = setInterval(checkForDocumentChanges, 500);

    // Clean up on component destruction
    onDestroy(() => {
      clearInterval(intervalId);
      // if (unsubscribe) unsubscribe();
    });
  });
</script>

<div class="flex gap-4 md:flex-col lg:flex-row">
  <pre
    id="highlight-pre"
    class="flex-1 max-h-[100vh] overflow-y-scroll"
    contenteditable="true">
    {#if highlightingKeywords}
      {@html content}
    {:else}
      {@html highlightedContent}
    {/if}
  </pre>
  <div class="max-w-lg mx-auto w-full">
    <div class="controls">
      <label for="tagSelect">Select a tag:</label>
      <br />
      <div class="flex gap-2">
        <div>
          <select id="tagSelect" bind:value={selectedTagIndex}>
            {#each tags as tag, i}
              <option value={i}>{tag.name}</option>
            {/each}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="cursor-pointer p-2 bg-gray-200 rounded-lg"
            on:click={applyTag}>Apply Tag</button
          >
          <button
            class="cursor-pointer p-2 bg-gray-200 rounded-lg flex"
            on:click={save}
          >
            {#if saving}<LoaderCircle class="animate-spin" />{/if} Save
          </button>
          <button
            on:click={() => highlightOccurrences()}
            class="cursor-pointer p-2 bg-gray-200 rounded-lg col-span-2"
          >
            {#if !highlightingKeywords}
              Highlight Occurrences
            {:else}
              Reset Occurrences
            {/if}
          </button>
        </div>
      </div>
      <div class="flex gap-2 p-2">
        <h2>
          <button
            class="cursor-pointer hover:bg-gray-200 p-2 rounded-sm"
            class:border-b-4={currentTab == "highlights"}
            on:click={() => changeTab("highlights")}>Highlights</button
          >
        </h2>
        <h2>
          <button
            class="cursor-pointer hover:bg-gray-200 p-2 rounded-sm"
            class:border-b-4={currentTab == "auto"}
            on:click={() => changeTab("auto")}>Auto</button
          >
        </h2>
      </div>
    </div>

    <div class="max-h-screen overflow-y-scroll">
      {#if currentTab == "highlights"}
        <ul transition:fly={{ x: -100 }}>
          {#each Object.entries(highlights) as [key, value]}
            {#each value as h, index}
              <div>
                <li
                  style={`background-color: ${h.color}; padding: 0.2em 0.5em;`}
                  class="my-2 p-2 rounded-lg"
                >
                  <div class="flex">
                    <b class="block flex-1">{key}</b>
                    <button
                      class="cursor-pointer pt-2"
                      on:click={() => removeItem(key, index)}><X /></button
                    >
                  </div>
                  <div>
                    <div>{h.text}</div>
                  </div>
                </li>
              </div>
            {/each}
          {/each}
        </ul>
      {:else if !auto}
        <button
          on:click={() => performAutoTag()}
          class="cursor-pointer p-2 bg-gray-200 rounded-lg"
        >
          {#if loadingAutoTags}
            <LoaderCircle class="animate-spin inline-block mr-1" /> Loading...
          {:else}
            Auto Tag
          {/if}
        </button>
      {:else}
        <div class="p-2 border-b">
          <div class="mb-2">
            <label for="confidenceThreshold">Minimum Confidence: </label>
            <input
              type="range"
              id="confidenceThreshold"
              min="0"
              max="1"
              step="0.05"
              value="0.5"
              on:input={(e) => filterByConfidence((e.target as HTMLInputElement | null)?.value || "0")}
            />
            <span id="confidenceValue">{threshold_value}</span>
          </div>

          <div class="mb-2">
            <label for="tagFilter">Filter by tag: </label>
            <select
              id="tagFilter"
              on:change={(e) => filterByTag((e.target as HTMLSelectElement | null)?.value || "")}
            >
              <option value="all">All Tags</option>
              {#each tags as tag}
                <option value={tag.name}>{tag.name}</option>
              {/each}
            </select>
          </div>

          <button
            on:click={() => highlightPredictions()}
            class="cursor-pointer p-2 bg-gray-200 rounded-lg w-full"
          >
            {#if !highlightingKeywords}
              Highlight Predictions by Confidence
            {:else}
              Reset Highlight Predictions by Confidence
            {/if}
          </button>
        </div>
        <ul transition:fly={{ x: -100 }}>
          {#each auto as highlight, index}
            {@const confidence = Math.max(...highlight.probabilities)}
            <li
              class="p-2 m-2 rounded-sm relative"
              style={`background-color: ${getTagColor(highlight.predicted_clause)}; opacity: ${0.3 + confidence * 0.7};`}
            >
              <div class="flex justify-between items-center">
                <b>{highlight.predicted_clause}</b>
                <div
                  class="flex p-1 text-gray-50 rounded-lg"
                  style={confidence >= 0.8
                    ? "background-color: #4CAF50"
                    : confidence >= 0.6
                      ? "background-color: #FFC107"
                      : "background-color: #F44336"}
                >
                  <b class="block bold">
                    {(confidence * 100).toFixed(1)}%
                  </b>
                  {#if !highlight.added}
                  <button
                    class="rounded-full p-1 cursor-pointer"
                    on:click={() => addAutoHighlight(highlight, index)}
                  >
                    <Plus />
                  </button>
                  {/if}
                </div>
              </div>
              <p>{highlight.sentence}</p>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div></div>
  </div>
</div>

<style>
  .controls {
    margin-top: 1em;
  }

  pre {
    white-space: pre-wrap; /* Since CSS 2.1 */
    white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
    white-space: -pre-wrap; /* Opera 4-6 */
    white-space: -o-pre-wrap; /* Opera 7 */
    word-wrap: break-word; /* Internet Explorer 5.5+ */
    outline: none;
  }
</style>
