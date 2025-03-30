import { fetch, stream } from 'undici'
import { TextDecoderStream } from 'node:stream/web'
import { Observable } from 'rxjs'

/**
 * Create asnyc request to ChatGpt api gets a response.
 * @param question is that want to ask to ChatGpt.
 * @param apikey of ChatGpt.
 * @returns 
 */
export async function askToChatGpt(model: string, query: string | Array<any>, apiKey: string, temperature: number = 1): Promise<string> {
  try {
    // 👇️ const response: Response
    if (typeof query === 'string') {
      query = [{ role: "user", content: query }]
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: model,
        messages: query,
        //temperature: temperature, //not supported by o1
        stream: false
      }),
      headers: {
        "Content-Type": 'application/json',
        authorization: 'Bearer ' + apiKey,
      },
    })

    const result: any = (await response.json())

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.choices[0].message.content
  } catch (error) {
    if (error instanceof Error) {
      console.log('error message: ', error.message)
      throw error
    } else {
      console.log('unexpected error: ', error)
      throw error
    }
  }
}


export async function* askToChatGptAsStream(model: string, messages: Array<any> | undefined, apiKey: string, temperature: number): AsyncIterable<string> {

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify({
      model,
      messages: messages,
      temperature: Number(temperature),
      stream: true,
    }),
    headers: {
      "Content-Type": "application/json",
      authorization: "Bearer " + apiKey,
    },
  })

  // Handle bad status or missing body
  // We prefer to get the whole error in stream lower down
  if (!res.ok || !res.body) {
    //throw new Error(`Request failed with status ${res.status}`)
  }
  if (res.body === null) {
    throw new Error("Response body is null")
  }

  // Create a streaming text reader
  const textStream = res.body.pipeThrough(new TextDecoderStream())
  let errorPart = ""

  // Read chunks from the stream
  for await (const chunk of textStream) {
    // Split into separate events
    const eventStr = chunk.split("\n\n")
    for (const str of eventStr) {
      const jsonStr = str.replace("data: ", "").trim()
      if (jsonStr === "[DONE]") {
        // Signal end of message
        yield "END MESSAGE"
        continue
      }
      if (jsonStr === "") {
        // Skip empty lines
        continue
      }
      try {
        const data: any = JSON.parse(jsonStr)
        // Normal content
        if (data.choices) {
          const thisContent = data.choices[0].delta?.content || ""
          yield thisContent
        } else {
          // API returned an error structure
          throw new Error(data.error.message)
        }
      } catch {
        // The chunk isn't valid JSON yet; accumulate it to see if more chunks form valid JSON
        errorPart += jsonStr
        try {
          const data: any = JSON.parse(errorPart)
          if (data.error === undefined) {
            // Not an error, but still not valid JSON
            continue
          } else {
            // API returned an error structure
          throw new Error(data.error.message); // Bubble up as an error
          }
        } catch (err) {
          // Still not valid, wait for more
          // I need to rethrow the error I created above though
          //so I don't do anything if it's a JSON.parse error but I throw my 
          //own error if it's not a JSON.parse error
          if (err instanceof SyntaxError) {
            continue
          } else {
            throw err
          }
        }
      }
    }
  }
}

export async function promptToTextDavinci003(prompt: string, apikey: string) {
  try {
    // 👇️ const response: Response
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 2048,
        temperature: 0.0,
        top_p: 0.1
      }),
      headers: {
        "Content-Type": 'application/json',
        authorization: 'Bearer ' + apikey,
      },
    })

    if (!response.ok) {
      throw new Error(`Error! status: ${response.status}`)
    }

    const result: any = (await response.json())

    return result.choices[0].text
  } catch (error) {
    if (error instanceof Error) {
      console.log('error message: ', error.message)
    } else {
      console.log('unexpected error: ', error)
    }
    throw error
  }
}

/**
 * Create asnyc request to ChatGpt api to generate a new images.
 * @param prompt 
 * @param apiKey 
 * @param size 
 * @returns 
 */
export async function imageGenerationeFromChatGpt(prompt: string | undefined, apiKey: string, size: string = "1024x1024") {
  try {
    // 👇️ const response: Response
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1, //only one image is supported in dall-e-3
        quality: "hd", //default is standard; only in dall-e-3
        size: size
      }),
      headers: {
        "Content-Type": 'application/json',
        authorization: 'Bearer ' + apiKey,
      },
    })

    // Handle bad status or missing body
    // We prefer to get the whole error in stream lower down
    //(does not work as of now because the error comes after the promise...)
    if (!response.ok) {
      console.log("response not ok"); //I have no clue where this shows up
    }

    const result: any = (await response.json())

    if (result.error) { 
      //The "Error" is necessary; it's how the caller recognizes an error
      return "Error" + result.error.message
    }
    return result.data
  } catch (error) {
    if (error instanceof Error) {
      console.log('error message: ', error.message)
      //The "Error" is necessary; it's how the caller recognizes an error
      return "Error" + error.message
    } else {
      console.log('unexpected error: ', error)
      //The "Error" is necessary; it's how the caller recognizes an error
      return 'An unexpected Error occurred'
    }
  }
}