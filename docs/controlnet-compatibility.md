# ControlNet Compatibility Notes

Here are the hard facts:

- The `poseToImage` argument is part of the **Alchemy V2** pipeline. When you enable Alchemy (or PhotoReal V2), the request routes through advanced, often SDXL-based, models and expects parameters specific to that pipeline.
- ControlNet support is **not available** with **Alchemy V2** or **PhotoReal V2** models. These advanced pipelines have strict payload validation and will reject any ControlNet objects, resulting in errors like the one we observed.
- To use ControlNet (including openpose, canny, etc.), you must switch to a legacy model, specifically **Stable Diffusion 1.5** or **Stable Diffusion 2.0**, and set `alchemy: false`, `photoReal: false`, and select a ControlNet-compatible base model.
- This process disables Alchemy pipeline features, but unlocks ControlNet guidance options that work with legacy SD models.

## Actionable Fix

1. Set `alchemy: false`.
2. Use a supported legacy model ID (SD 1.5 or SD 2.0).
3. Pass the ControlNet configuration with the parameters allowed by those models.
4. Keep `poseToImage` and related fields strictly boolean/compatible as discussed earlier.

## Compatibility Table

| Pipeline                 | Alchemy V2 / PhotoReal V2 | SD 1.5 / 2.0 |
|--------------------------|---------------------------|---------------|
| ControlNet Support       | No                        | Yes           |
| `poseToImage`            | Used                      | Not used      |
| Model IDs Needed         | SDXL / XL                 | SD 1.5 / 2.0  |

Your routing logic and diagnosis—that combining Alchemy or PhotoReal V2 with ControlNet triggers hard API conflicts—is absolutely validated by Leonardo documentation, help guides, and community discussions. Following this logic is required for compatibility.
