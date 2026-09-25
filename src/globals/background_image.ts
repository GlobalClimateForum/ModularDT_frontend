import { ref } from 'vue'

export const background_image = ref<HTMLImageElement | null>(null)

export async function fetchBackgoundImage(url: string) {
  console.log(url)

  const image = new Image()
  image.src = url
  image.onload = () => {
    background_image.value = image
    if (!image) {
      console.warn("background image ", url, " could not be loaded. Check URL and permissions.")
    }
  }
}
