from __future__ import annotations

import math
from typing import Iterable

import torch
from torch import nn


class PointWiseFeedForward(nn.Module):
    """Position-wise feed-forward block used inside SASRec."""

    def __init__(
        self,
        hidden_units: int,
        dropout_rate: float,
    ) -> None:
        super().__init__()

        self.linear1 = nn.Linear(
            hidden_units,
            hidden_units,
        )

        self.activation = nn.ReLU()

        self.dropout1 = nn.Dropout(
            dropout_rate,
        )

        self.linear2 = nn.Linear(
            hidden_units,
            hidden_units,
        )

        self.dropout2 = nn.Dropout(
            dropout_rate,
        )

    def forward(
        self,
        x: torch.Tensor,
    ) -> torch.Tensor:

        x = self.linear1(x)
        x = self.activation(x)
        x = self.dropout1(x)

        x = self.linear2(x)
        x = self.dropout2(x)

        return x


class SASRecBlock(nn.Module):

    def __init__(
        self,
        hidden_units: int,
        num_heads: int,
        dropout_rate: float,
        norm_first: bool = True,
    ) -> None:

        super().__init__()

        if hidden_units % num_heads != 0:
            raise ValueError(
                "hidden_units must be divisible by num_heads"
            )

        self.norm_first = norm_first

        self.attention_norm = nn.LayerNorm(
            hidden_units,
            eps=1e-8,
        )

        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_units,
            num_heads=num_heads,
            dropout=dropout_rate,
            batch_first=True,
        )

        self.feed_forward_norm = nn.LayerNorm(
            hidden_units,
            eps=1e-8,
        )

        self.feed_forward = PointWiseFeedForward(
            hidden_units,
            dropout_rate,
        )

    def forward(
        self,
        x: torch.Tensor,
        causal_mask: torch.Tensor,
        padding_mask: torch.Tensor,
    ) -> torch.Tensor:

        if self.norm_first:

            normalized = self.attention_norm(x)

            attention_output, _ = self.attention(
                normalized,
                normalized,
                normalized,
                attn_mask=causal_mask,
                key_padding_mask=padding_mask,
                need_weights=False,
            )

            x = x + attention_output

            normalized = self.feed_forward_norm(x)

            x = x + self.feed_forward(
                normalized
            )

        else:

            attention_output, _ = self.attention(
                x,
                x,
                x,
                attn_mask=causal_mask,
                key_padding_mask=padding_mask,
                need_weights=False,
            )

            x = self.attention_norm(
                x + attention_output
            )

            x = self.feed_forward_norm(
                x + self.feed_forward(x)
            )

        # Keep padding positions zero.
        return x.masked_fill(
            padding_mask.unsqueeze(-1),
            0.0,
        )


class SASRec(nn.Module):

    def __init__(
        self,
        item_num: int,
        maxlen: int = 50,
        hidden_units: int = 50,
        num_blocks: int = 2,
        num_heads: int = 1,
        dropout_rate: float = 0.2,
        norm_first: bool = True,
    ) -> None:

        super().__init__()

        if item_num < 1:
            raise ValueError(
                "item_num must be at least 1"
            )

        if maxlen < 2:
            raise ValueError(
                "maxlen must be at least 2"
            )

        self.item_num = int(
            item_num
        )

        self.maxlen = int(
            maxlen
        )

        self.hidden_units = int(
            hidden_units
        )

        # Item 0 is reserved for padding.
        self.item_embedding = nn.Embedding(
            self.item_num + 1,
            hidden_units,
            padding_idx=0,
        )

        self.position_embedding = nn.Embedding(
            self.maxlen + 1,
            hidden_units,
            padding_idx=0,
        )

        self.embedding_dropout = nn.Dropout(
            dropout_rate
        )

        self.blocks = nn.ModuleList(
            [
                SASRecBlock(
                    hidden_units=hidden_units,
                    num_heads=num_heads,
                    dropout_rate=dropout_rate,
                    norm_first=norm_first,
                )
                for _ in range(
                    num_blocks
                )
            ]
        )

        self.final_norm = nn.LayerNorm(
            hidden_units,
            eps=1e-8,
        )

        self.reset_parameters()

    def reset_parameters(
        self,
    ) -> None:

        for module in self.modules():

            if isinstance(
                module,
                nn.Embedding,
            ):

                nn.init.xavier_normal_(
                    module.weight
                )

            elif isinstance(
                module,
                nn.Linear,
            ):

                nn.init.xavier_normal_(
                    module.weight
                )

                if module.bias is not None:
                    nn.init.zeros_(
                        module.bias
                    )

            elif isinstance(
                module,
                nn.MultiheadAttention,
            ):

                nn.init.xavier_normal_(
                    module.in_proj_weight
                )

                if (
                    module.in_proj_bias
                    is not None
                ):
                    nn.init.zeros_(
                        module.in_proj_bias
                    )

                nn.init.xavier_normal_(
                    module.out_proj.weight
                )

                if (
                    module.out_proj.bias
                    is not None
                ):
                    nn.init.zeros_(
                        module.out_proj.bias
                    )

        with torch.no_grad():

            self.item_embedding.weight[
                0
            ].zero_()

            self.position_embedding.weight[
                0
            ].zero_()

    def encode(
        self,
        log_seqs: torch.Tensor,
    ) -> torch.Tensor:

        if log_seqs.ndim != 2:
            raise ValueError(
                "log_seqs must have shape "
                "[batch, sequence_length]"
            )

        log_seqs = log_seqs.long()

        batch_size, sequence_length = (
            log_seqs.shape
        )

        if (
            sequence_length
            > self.maxlen
        ):
            raise ValueError(
                f"sequence_length="
                f"{sequence_length} "
                f"exceeds maxlen="
                f"{self.maxlen}"
            )

        device = log_seqs.device

        padding_mask = (
            log_seqs.eq(0)
        )

        positions = torch.arange(
            1,
            sequence_length + 1,
            device=device,
            dtype=torch.long,
        )

        positions = (
            positions
            .unsqueeze(0)
            .expand(
                batch_size,
                -1,
            )
        )

        positions = (
            positions.masked_fill(
                padding_mask,
                0,
            )
        )

        x = self.item_embedding(
            log_seqs
        )

        x = (
            x
            * math.sqrt(
                self.hidden_units
            )
        )

        x = (
            x
            + self.position_embedding(
                positions
            )
        )

        x = self.embedding_dropout(
            x
        )

        x = x.masked_fill(
            padding_mask.unsqueeze(-1),
            0.0,
        )

        # Prevent attention from looking
        # into future positions.
        causal_mask = torch.triu(
            torch.ones(
                sequence_length,
                sequence_length,
                dtype=torch.bool,
                device=device,
            ),
            diagonal=1,
        )

        for block in self.blocks:

            x = block(
                x,
                causal_mask=
                    causal_mask,
                padding_mask=
                    padding_mask,
            )

        x = self.final_norm(
            x
        )

        x = x.masked_fill(
            padding_mask.unsqueeze(-1),
            0.0,
        )

        return x

    def forward(
        self,
        log_seqs: torch.Tensor,
        pos_seqs: torch.Tensor,
        neg_seqs: torch.Tensor,
    ) -> tuple[
        torch.Tensor,
        torch.Tensor,
    ]:

        features = self.encode(
            log_seqs
        )

        pos_embeddings = (
            self.item_embedding(
                pos_seqs.long()
            )
        )

        neg_embeddings = (
            self.item_embedding(
                neg_seqs.long()
            )
        )

        pos_logits = (
            features
            * pos_embeddings
        ).sum(
            dim=-1
        )

        neg_logits = (
            features
            * neg_embeddings
        ).sum(
            dim=-1
        )

        return (
            pos_logits,
            neg_logits,
        )

    @torch.no_grad()
    def predict(
        self,
        log_seqs: torch.Tensor,
        item_indices:
            torch.Tensor
            | Iterable[int],
    ) -> torch.Tensor:

        self.eval()

        features = self.encode(
            log_seqs
        )

        final_feature = features[
            :,
            -1,
            :,
        ]

        if not torch.is_tensor(
            item_indices
        ):

            item_indices = (
                torch.tensor(
                    list(
                        item_indices
                    ),
                    dtype=torch.long,
                    device=
                        log_seqs.device,
                )
            )

        else:

            item_indices = (
                item_indices.to(
                    device=
                        log_seqs.device,
                    dtype=torch.long,
                )
            )

        if (
            item_indices.ndim
            == 1
        ):

            item_embeddings = (
                self.item_embedding(
                    item_indices
                )
            )

            return (
                final_feature
                @ item_embeddings
                .transpose(
                    0,
                    1,
                )
            )

        if (
            item_indices.ndim
            == 2
        ):

            item_embeddings = (
                self.item_embedding(
                    item_indices
                )
            )

            return torch.bmm(
                item_embeddings,
                final_feature
                .unsqueeze(-1),
            ).squeeze(-1)

        raise ValueError(
            "item_indices must be "
            "1-D or 2-D"
        )